/* ============================================================
   Barbearia RickGino — bookings.js
   Fluxo de marcação em 7 passos + camada de dados das
   marcações.
   ============================================================ */

"use strict";

(function () {
  const D = window.SITE_DATA;
  const RG = window.RG;

  /* ========================================================
     BOOKINGS STORE
     ======================================================== */

  const Store = {

    async listAll() {
      const auth = window.Auth;

      if (auth.isDemo()) {
        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        const prof = auth.getUser();
        if (!prof) return [];

        return all.filter((b) => b.used_id === prof.id);
      }

      const user = auth.getUser();
      if (!user) return [];

      const { data, error } = await auth
        .getClient()
        .from("booking")
        .select("*")
        .eq("used_id", user.id)
        .order("Data", { ascending: false });

      if (error) throw error;

      return data || [];
    },

    async upcoming() {
      const all = await Store.listAll();

      const today = RG.toISODate(new Date());

      return all
        .filter((b) =>
          String(b.Status || "").toLowerCase() === "confirmada" &&
          String(b.Data) >= today
        )
        .sort((a, b) =>
          (String(a.Data) + String(a.Hora))
            .localeCompare(String(b.Data) + String(b.Hora))
        );
    },

    async byId(id) {
      const all = await Store.listAll();

      return (
        all.find((b) => String(b.id) === String(id)) ||
        null
      );
    },

    async create(payload) {
      const auth = window.Auth;
      const reference = genReference();

      if (auth.isDemo()) {

        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        const now = new Date().toISOString();

        const rec = {
          id:
            "bk_" +
            Math.random()
              .toString(36)
              .slice(2, 12),

          used_id: auth.getUser().id,

          "Nome": payload.nome || "",
          "E-mail": payload.email || "",
          "Serviço": payload.service_name,
          "Barbeiro": payload.barber_name,
          "Data": payload.booking_date,
          "Hora": payload.booking_time,
          "Status": "confirmada",

          reference,
          created_at: now,
          updated_at: now,
        };

        all.push(rec);

        localStorage.setItem(
          "rg_bookings",
          JSON.stringify(all)
        );

        return rec;
      }

      const user = auth.getUser();

      if (!user) {
        throw new Error("Utilizador não autenticado.");
      }

      /*
       * IMPORTANTE:
       * A tua tabela real chama-se:
       * public.booking
       *
       * E as colunas são:
       * Nome
       * E-mail
       * Serviço
       * Barbeiro
       * Data
       * Hora
       * Status
       * used_id
       */

      const { data, error } = await auth
        .getClient()
        .from("booking")
        .insert([
          {
            "Nome": payload.nome || "",
            "E-mail": payload.email || "",
            "Serviço": payload.service_name || "",
            "Barbeiro": payload.barber_name || "",
            "Data": payload.booking_date,
            "Hora": payload.booking_time,
            "Status": "confirmada",
            "used_id": user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Erro Supabase ao criar marcação:", error);
        throw error;
      }

      return {
        ...data,
        reference,
        booking_date: data.Data,
        booking_time: data.Hora,
        service_name: data["Serviço"],
        barber_name: data["Barbeiro"],
        status: data.Status,
      };
    },

    async cancel(id) {
      const auth = window.Auth;

      if (auth.isDemo()) {

        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        const idx = all.findIndex(
          (b) => String(b.id) === String(id)
        );

        if (idx === -1) {
          throw new Error("Marcação não encontrada.");
        }

        all[idx].Status = "cancelada";
        all[idx].updated_at =
          new Date().toISOString();

        localStorage.setItem(
          "rg_bookings",
          JSON.stringify(all)
        );

        return all[idx];
      }

      const { data, error } = await auth
        .getClient()
        .from("booking")
        .update({
          "Status": "cancelada",
        })
        .eq("id", id)
        .eq("used_id", auth.getUser().id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    /*
     * Horários ocupados.
     *
     * Não deixamos a data depender desta função.
     * Ela só é usada quando chegamos ao passo Horário.
     */

    async getTakenSlots(dateISO) {

      const auth = window.Auth;

      if (auth.isDemo()) {

        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        return all
          .filter(
            (b) =>
              String(b.Status || "").toLowerCase() !==
                "cancelada" &&
              String(b.Data) === dateISO
          )
          .map((b) => ({
            booking_time: b.Hora,
            barber_name: b["Barbeiro"],
          }));
      }

      try {

        const { data, error } = await auth
          .getClient()
          .from("booking")
          .select('"Hora", "Barbeiro", "Status"')
          .eq('"Data"', dateISO)
          .neq('"Status"', "cancelada");

        if (error) throw error;

        return (data || []).map((b) => ({
          booking_time: b["Hora"],
          barber_name: b["Barbeiro"],
        }));

      } catch (err) {

        console.warn(
          "Não foi possível consultar horários:",
          err?.message
        );

        /*
         * Mesmo que a consulta falhe,
         * os horários continuam aparecendo.
         */
        return [];
      }
    },
  };

  function genReference() {

    const chars =
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    let r = "";

    for (let i = 0; i < 6; i++) {
      r += chars[
        Math.floor(Math.random() * chars.length)
      ];
    }

    const d = new Date();

    return (
      "RG" +
      String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0") +
      "-" +
      r
    );
  }

  window.BookingsStore = Store;


  /* ========================================================
     WIZARD
     ======================================================== */

  const Steps = [
    "Serviço",
    "Barbeiro",
    "Data",
    "Horário",
    "Dados",
    "Resumo",
    "Confirmado",
  ];

  const state = {

    step: 0,

    service: null,

    barber: null,

    noBarberPref: true,

    date: null,

    time: null,

    nome: "",

    telefone: "",

    email: "",

    taken: [],

    submitting: false,

    lastBooking: null,

    /* CONTROLO DO MÊS */
    calendarYear: new Date().getFullYear(),

    calendarMonth: new Date().getMonth(),
  };


  let modal,
    body,
    dots,
    foot,
    backBtn,
    nextBtn,
    stepTitle,
    stepLabel;


  function open(opts = {}) {

    resetState();

    if (opts.serviceId) {

      state.service =
        D.services.find(
          (s) => s.id === opts.serviceId
        ) || null;
    }

    if (opts.barberId) {

      state.barber =
        D.team.find(
          (t) => t.id === opts.barberId
        ) || null;

      state.noBarberPref = !state.barber;
    }

    /*
     * Sempre começa no mês atual.
     */
    const now = new Date();

    state.calendarYear =
      now.getFullYear();

    state.calendarMonth =
      now.getMonth();

    if (!modal) {
      init();
    }

    if (!modal) return;

    modal.classList.add("open");

    document.body.style.overflow = "hidden";

    render();
  }


  function close() {

    if (!modal) return;

    modal.classList.remove("open");

    document.body.style.overflow = "";
  }


  function resetState() {

    state.step = 0;

    state.service = null;

    state.barber = null;

    state.noBarberPref = true;

    state.date = null;

    state.time = null;

    state.taken = [];

    state.submitting = false;

    state.lastBooking = null;

    state.nome = "";

    state.telefone = "";

    state.email = "";

    const now = new Date();

    state.calendarYear =
      now.getFullYear();

    state.calendarMonth =
      now.getMonth();
  }


  function init() {

    modal =
      document.getElementById(
        "bookingModal"
      );

    if (!modal) return;

    body =
      document.getElementById(
        "bookingStep"
      );

    dots =
      document.getElementById(
        "bookingDots"
      );

    foot =
      document.getElementById(
        "bookingFoot"
      );

    backBtn =
      document.getElementById(
        "bookingBack"
      );

    nextBtn =
      document.getElementById(
        "bookingNext"
      );

    stepLabel =
      document.getElementById(
        "bookingStepLabel"
      );

    stepTitle =
      document.getElementById(
        "bookingStepTitle"
      );


    document
      .getElementById("bookingClose")
      ?.addEventListener(
        "click",
        close
      );


    modal.addEventListener(
      "click",
      (e) => {

        if (e.target === modal) {
          close();
        }
      }
    );


    document.addEventListener(
      "keydown",
      (e) => {

        if (
          e.key === "Escape" &&
          modal.classList.contains("open")
        ) {
          close();
        }
      }
    );


    backBtn?.addEventListener(
      "click",
      () => {

        if (state.step === 6) return;

        state.step--;

        if (state.step === 4) {
          refreshStepData();
        }

        render();
      }
    );


    nextBtn?.addEventListener(
      "click",
      onNext
    );


    if (window.Auth) {

      window.Auth.setOnAuthChange(
        () => {

          if (
            modal &&
            modal.classList.contains("open")
          ) {

            if (state.step === 4) {
              refreshStepData();
            }

            render();
          }
        }
      );
    }
  }


  function render() {

    if (
      !body ||
      !modal ||
      !stepTitle ||
      !stepLabel ||
      !dots
    ) {
      return;
    }

    const s = state.step;

    stepLabel.textContent =
      `Passo ${s + 1} de ${Steps.length}`;

    stepTitle.textContent =
      Steps[s];


    dots.innerHTML =
      Steps.map(
        (_, i) =>
          `<span class="step-dot ${
            i === s ? "active" : ""
          } ${
            i < s ? "done" : ""
          }"></span>`
      ).join("");


    body.innerHTML = "";


    const renderers = [
      stepService,
      stepBarber,
      stepDate,
      stepTime,
      stepData,
      stepSummary,
      stepSuccess,
    ];


    try {

      const result =
        renderers[s]();

      /*
       * stepTime é assíncrono.
       */
      if (
        result &&
        typeof result.catch === "function"
      ) {
        result.catch((err) => {

          console.error(
            "Erro ao carregar passo:",
            err
          );

          body.innerHTML = `
            <div class="b-auth-required">
              <span class="auth-ic">
                ${window.RGICONS?.info || ""}
              </span>

              <p>
                Não foi possível carregar este passo.
              </p>

              <button
                type="button"
                class="btn btn-gold"
                id="retryStep"
              >
                Tentar novamente
              </button>
            </div>
          `;

          body
            .querySelector("#retryStep")
            ?.addEventListener(
              "click",
              () => render()
            );
        });
      }

    } catch (err) {

      console.error(
        "Erro ao renderizar passo:",
        err
      );
    }


    if (foot) {
      foot.style.display =
        s === 6 ? "none" : "flex";
    }

    if (backBtn) {
      backBtn.style.visibility =
        s === 0 ? "hidden" : "visible";
    }


    if (nextBtn) {

      if (s === 5) {

        nextBtn.innerHTML = `
          ${window.RGICONS.check}
          <span>Confirmar marcação</span>
        `;

        nextBtn.classList.add(
          "btn-gold"
        );

        nextBtn.disabled =
          state.submitting;

      } else {

        nextBtn.innerHTML = `
          Continuar
          ${window.RGICONS.arrowRight}
        `;

        nextBtn.classList.add(
          "btn-gold"
        );

        nextBtn.disabled = false;
      }
    }
  }


  async function onNext() {

    const s = state.step;


    if (
      s === 0 &&
      !state.service
    ) {
      return window.showToast(
        "Escolhe um serviço para continuar.",
        "info"
      );
    }


    if (
      s === 1 &&
      !state.noBarberPref &&
      !state.barber
    ) {
      return window.showToast(
        'Escolhe um barbeiro (ou "Sem preferência").',
        "info"
      );
    }


    if (
      s === 2 &&
      !state.date
    ) {
      return window.showToast(
        "Escolhe um dia.",
        "info"
      );
    }


    if (
      s === 3 &&
      !state.time
    ) {
      return window.showToast(
        "Escolhe um horário.",
        "info"
      );
    }


    if (s === 4) {

      if (!window.Auth.isLoggedIn()) {

        return window.showToast(
          "Inicia sessão para continuar.",
          "info"
        );
      }

      if (!state.nome.trim()) {

        return window.showToast(
          "Indica o teu nome.",
          "error"
        );
      }

      if (!state.telefone.trim()) {

        return window.showToast(
          "Indica o teu telefone.",
          "error"
        );
      }
    }


    if (s === 5) {

      confirmBooking();

      return;
    }


    state.step++;


    if (state.step === 4) {

      await refreshStepData();

      render();

      return;
    }


    render();
  }


  async function refreshStepData() {

    const prof =
      await window.Auth.getProfile();

    if (prof) {

      state.nome =
        prof.nome || "";

      state.telefone =
        prof.telefone || "";

      state.email =
        prof.email || "";
    }
  }


  /* ========================================================
     PASSO 1
     ======================================================== */

  function stepService() {

    body.innerHTML = `
      <div class="service-options">

        ${D.services
          .map(
            (s) => `
              <button
                type="button"
                class="service-opt ${
                  state.service?.id === s.id
                    ? "selected"
                    : ""
                }"
                data-svc="${esc(s.id)}"
              >

                <span class="so-name">
                  ${esc(s.name)}
                </span>

                <span class="so-meta">
                  <span>
                    ${s.duration} min
                  </span>

                  <span class="so-price">
                    ${s.price}€
                  </span>
                </span>

              </button>
            `
          )
          .join("")}

      </div>
    `;


    body
      .querySelectorAll(".service-opt")
      .forEach((btn) => {

        btn.addEventListener(
          "click",
          () => {

            state.service =
              D.services.find(
                (s) =>
                  s.id ===
                  btn.dataset.svc
              );

            body
              .querySelectorAll(
                ".service-opt"
              )
              .forEach(
                (b) =>
                  b.classList.toggle(
                    "selected",
                    b === btn
                  )
              );
          }
        );
      });
  }


  /* ========================================================
     PASSO 2
     ======================================================== */

  function stepBarber() {

    const anySelected =
      state.noBarberPref;


    body.innerHTML = `
      <div class="barber-options">

        <button
          type="button"
          class="barber-opt ${
            anySelected
              ? "selected"
              : ""
          }"
          data-barber="any"
        >

          <span class="bo-avatar">
            ${window.RGICONS.scissors}
          </span>

          <span class="bo-name">
            Sem preferência
          </span>

          <span class="badge-any">
            Primeiro disponível
          </span>

        </button>


        ${D.team
          .map(
            (t) => `
              <button
                type="button"
                class="barber-opt ${
                  state.barber?.id === t.id
                    ? "selected"
                    : ""
                }"
                data-barber="${esc(t.id)}"
              >

                <span class="bo-avatar">

                  ${
                    t.photo
                      ? `<img src="${esc(
                          t.photo
                        )}" alt="">`
                      : window.RG.initials(
                          t.name
                        )
                  }

                </span>

                <span class="bo-name">
                  ${esc(t.name)}
                </span>

                <span class="bo-spec">
                  ${esc(t.specialty)}
                </span>

              </button>
            `
          )
          .join("")}

      </div>
    `;


    body
      .querySelectorAll(".barber-opt")
      .forEach((btn) => {

        btn.addEventListener(
          "click",
          () => {

            if (
              btn.dataset.barber ===
              "any"
            ) {

              state.barber = null;

              state.noBarberPref =
                true;

            } else {

              state.barber =
                D.team.find(
                  (t) =>
                    t.id ===
                    btn.dataset.barber
                );

              state.noBarberPref =
                false;
            }


            body
              .querySelectorAll(
                ".barber-opt"
              )
              .forEach(
                (b) =>
                  b.classList.toggle(
                    "selected",
                    b === btn
                  )
              );
          }
        );
      });
  }


  /* ========================================================
     PASSO 3 — DATA
     ======================================================== */

  function stepDate() {

    /*
     * DATA ATUAL
     */
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );


    /*
     * Garante que o mês não fica
     * num mês antigo.
     */
    if (
      state.calendarYear <
        today.getFullYear() ||
      (
        state.calendarYear ===
          today.getFullYear() &&
        state.calendarMonth <
          today.getMonth()
      )
    ) {

      state.calendarYear =
        today.getFullYear();

      state.calendarMonth =
        today.getMonth();
    }


    const year =
      state.calendarYear;

    const month =
      state.calendarMonth;


    /*
     * Primeiro dia do mês.
     */
    const firstDay =
      new Date(
        year,
        month,
        1
      );


    /*
     * Último dia do mês.
     */
    const lastDay =
      new Date(
        year,
        month + 1,
        0
      );


    /*
     * Quantidade de dias.
     */
    const totalDays =
      lastDay.getDate();


    /*
     * Dia da semana do primeiro dia.
     * Domingo = 0.
     */
    const firstWeekDay =
      firstDay.getDay();


    const dowNames = [
      "Dom",
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
    ];


    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];


    let html = `
      <div class="calendar">

        <div
          class="calendar-header"
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin-bottom:16px;
          "
        >

          <button
            type="button"
            class="calendar-nav"
            id="calendarPrev"
            aria-label="Mês anterior"
          >
            ‹
          </button>

          <strong
            class="calendar-title"
          >
            ${monthNames[month]}
            ${year}
          </strong>

          <button
            type="button"
            class="calendar-nav"
            id="calendarNext"
            aria-label="Próximo mês"
          >
            ›
          </button>

        </div>

        <div class="date-weekdays">
          ${dowNames
            .map(
              (d) =>
                `<span>${d}</span>`
            )
            .join("")}
        </div>

        <div class="date-options calendar-grid">
    `;


    /*
     * Espaços antes do dia 1.
     */
    for (
      let i = 0;
      i < firstWeekDay;
      i++
    ) {

      html += `
        <span
          class="date-empty"
        ></span>
      `;
    }


    /*
     * TODOS os dias do mês.
     */
    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {

      const date =
        new Date(
          year,
          month,
          day
        );


      date.setHours(
        0,
        0,
        0,
        0
      );


      const dateISO =
        `${year}-${String(
          month + 1
        ).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;


      /*
       * Dias anteriores a hoje ficam bloqueados.
       */
      const past =
        date < today;


      /*
       * Dias fechados configurados
       * também ficam bloqueados.
       */
      const dow =
        date.getDay();


      const closed =
        (
          D.bookingClosedWeekdays ||
          []
        ).includes(dow);


      const disabled =
        past || closed;


      const selected =
        state.date === dateISO;


      html += `
        <button
          type="button"
          class="date-opt ${
            selected
              ? "selected"
              : ""
          } ${
            disabled
              ? "disabled"
              : ""
          }"
          data-date="${dateISO}"
          ${disabled ? "disabled" : ""}
        >

          <span class="dow">
            ${dowNames[dow]}
          </span>

          <span class="day">
            ${day}
          </span>

          <span class="mon">
            ${monthNames[month].slice(0, 3)}
          </span>

        </button>
      `;
    }


    html += `
        </div>

      </div>

      <p
        style="
          color:var(--muted);
          font-size:.8rem;
          margin-top:14px;
        "
      >
        ${window.RGICONS.info}
        Os dias que já passaram e os dias
        encerrados ficam bloqueados.
      </p>
    `;


    body.innerHTML = html;


    /*
     * MÊS ANTERIOR
     */
    body
      .querySelector("#calendarPrev")
      ?.addEventListener(
        "click",
        () => {

          const current =
            new Date(
              today.getFullYear(),
              today.getMonth(),
              1
            );

          const selected =
            new Date(
              state.calendarYear,
              state.calendarMonth,
              1
            );


          /*
           * Não deixa voltar para
           * meses anteriores ao atual.
           */
          if (
            selected <= current
          ) {
            return;
          }


          state.calendarMonth--;

          if (
            state.calendarMonth <
            0
          ) {

            state.calendarMonth =
              11;

            state.calendarYear--;
          }


          render();
        }
      );


    /*
     * PRÓXIMO MÊS
     */
    body
      .querySelector("#calendarNext")
      ?.addEventListener(
        "click",
        () => {

          state.calendarMonth++;

          if (
            state.calendarMonth >
            11
          ) {

            state.calendarMonth =
              0;

            state.calendarYear++;
          }


          /*
           * Se mudou de mês,
           * limpa a data selecionada.
           */
          state.date = null;

          state.time = null;

          render();
        }
      );


    /*
     * CLIQUE NOS DIAS
     */
    body
      .querySelectorAll(
        ".date-opt:not(.disabled)"
      )
      .forEach((btn) => {

        btn.addEventListener(
          "click",
          () => {

            state.date =
              btn.dataset.date;

            state.time = null;


            body
              .querySelectorAll(
                ".date-opt"
              )
              .forEach(
                (b) =>
                  b.classList.toggle(
                    "selected",
                    b === btn
                  )
              );
          }
        );
      });
  }


  /* ========================================================
     PASSO 4 — HORÁRIO
     ======================================================== */

  async function stepTime() {

    if (!state.date) {

      state.step = 2;

      return render();
    }


    body.innerHTML = `
      <div class="b-loading">

        <div class="spinner"></div>

        <p>
          A consultar disponibilidade…
        </p>

      </div>
    `;


    try {

      state.taken =
        await Store.getTakenSlots(
          state.date
        );

    } catch (err) {

      state.taken = [];

      console.warn(err);
    }


    const taken =
      state.taken || [];


    /*
     * Se não houver bookingSlots
     * no SITE_DATA, usamos horários
     * padrão para o calendário não
     * ficar vazio.
     */
    const slots =
      Array.isArray(
        D.bookingSlots
      ) &&
      D.bookingSlots.length
        ? D.bookingSlots
        : [
            "09:00",
            "09:30",
            "10:00",
            "10:30",
            "11:00",
            "11:30",
            "12:00",
            "12:30",
            "14:00",
            "14:30",
            "15:00",
            "15:30",
            "16:00",
            "16:30",
            "17:00",
            "17:30",
            "18:00",
            "18:30",
            "19:00",
            "19:30",
          ];


    const timeTaken =
      (t) => {

        if (state.barber) {

          return taken.some(
            (x) =>
              String(
                x.booking_time
              ).slice(0, 5) ===
                String(t).slice(0, 5) &&
              x.barber_name ===
                state.barber.name
          );
        }


        return taken.some(
          (x) =>
            String(
              x.booking_time
            ).slice(0, 5) ===
            String(t).slice(0, 5)
        );
      };


    body.innerHTML = `
      <div class="slot-legend">

        <span class="lg-free">
          <i></i>
          Disponível
        </span>

        <span class="lg-taken">
          <i></i>
          Ocupado
        </span>

      </div>

      <div class="time-options">

        ${slots
          .map(
            (t) => {

              const occupied =
                timeTaken(t);

              return `
                <button
                  type="button"
                  class="time-opt ${
                    state.time === t
                      ? "selected"
                      : ""
                  } ${
                    occupied
                      ? "disabled"
                      : ""
                  }"
                  data-time="${esc(t)}"
                  ${
                    occupied
                      ? "disabled"
                      : ""
                  }
                >
                  ${esc(t)}
                </button>
              `;
            }
          )
          .join("")}

      </div>
    `;


    body
      .querySelectorAll(
        ".time-opt:not(.disabled)"
      )
      .forEach((btn) => {

        btn.addEventListener(
          "click",
          () => {

            state.time =
              btn.dataset.time;


            body
              .querySelectorAll(
                ".time-opt"
              )
              .forEach(
                (b) =>
                  b.classList.toggle(
                    "selected",
                    b === btn
                  )
              );
          }
        );
      });
  }


  /* ========================================================
     PASSO 5 — DADOS
     ======================================================== */

  function stepData() {

    const logged =
      window.Auth.isLoggedIn();


    if (!logged) {

      body.innerHTML = `
        <div class="b-auth-required">

          <span class="auth-ic">
            ${window.RGICONS.user}
          </span>

          <p>
            Para confirmares a marcação,
            inicia sessão com a tua conta Google.
          </p>

          <button
            type="button"
            class="btn-google"
            id="bLoginGoogle"
          >
            ${window.RGICONS.google}
            Continuar com Google
          </button>

        </div>
      `;


      body
        .querySelector(
          "#bLoginGoogle"
        )
        .addEventListener(
          "click",
          () =>
            window.Auth
              .signInWithGoogle()
              .catch(
                () =>
                  window.showToast(
                    "Login falhou. Tenta novamente.",
                    "error"
                  )
              )
        );


      return;
    }


    body.innerHTML = `
      <div class="b-form">

        <div class="field">

          <label for="bkNome">
            Nome
          </label>

          <input
            id="bkNome"
            type="text"
            value="${esc(state.nome)}"
            placeholder="O teu nome"
          >

        </div>


        <div class="field">

          <label for="bkTel">
            Telefone
          </label>

          <input
            id="bkTel"
            type="tel"
            value="${esc(state.telefone)}"
            placeholder="+351 ..."
          >

        </div>


        <div class="field full">

          <label for="bkEmail">
            Email
          </label>

          <input
            id="bkEmail"
            type="email"
            value="${esc(state.email)}"
            disabled
          >

          <span class="hint">
            O email vem da tua conta Google.
          </span>

        </div>

      </div>
    `;


    const iNome =
      body.querySelector("#bkNome");

    const iTel =
      body.querySelector("#bkTel");


    iNome?.addEventListener(
      "input",
      () =>
        (state.nome =
          iNome.value)
    );


    iTel?.addEventListener(
      "input",
      () =>
        (state.telefone =
          iTel.value)
    );
  }


  /* ========================================================
     PASSO 6 — RESUMO
     ======================================================== */

  function stepSummary() {

    if (
      !state.service ||
      !state.date ||
      !state.time
    ) {

      body.innerHTML = `
        <div class="b-auth-required">

          <p>
            Verifica os dados da marcação.
          </p>

        </div>
      `;

      return;
    }


    const dt =
      RG.parseISO(state.date);


    const b =
      state.barber || {
        name: "Sem preferência",
      };


    body.innerHTML = `
      <div class="b-summary">

        <div class="sum-row">

          <span class="k">
            Serviço
          </span>

          <span class="v">

            ${esc(
              state.service.name
            )}

            <span class="sub">
              ${state.service.duration}
              min
            </span>

          </span>

        </div>


        <div class="sum-row">

          <span class="k">
            Barbeiro
          </span>

          <span class="v">
            ${esc(b.name)}
          </span>

        </div>


        <div class="sum-row">

          <span class="k">
            Data
          </span>

          <span class="v">

            ${dt
              .getDate()
              .toString()
              .padStart(2, "0")}/${(
              dt.getMonth() + 1
            )
              .toString()
              .padStart(2, "0")}/${dt.getFullYear()}

          </span>

        </div>


        <div class="sum-row">

          <span class="k">
            Hora
          </span>

          <span class="v">
            ${esc(state.time)}
          </span>

        </div>


        <div class="sum-row">

          <span class="k">
            Nome
          </span>

          <span class="v">
            ${esc(state.nome)}
          </span>

        </div>


        <div class="sum-row sum-total">

          <span class="k">
            Total
          </span>

          <span class="v">
            ${state.service.price}€
          </span>

        </div>

      </div>
    `;
  }


  /* ========================================================
     PASSO 7 — CONFIRMAÇÃO
     ======================================================== */

  function stepSuccess() {

    const bk =
      state.lastBooking;


    if (!bk) {

      state.step = 5;

      return render();
    }


    const service =
      bk.service_name ||
      bk["Serviço"] ||
      "";


    const barber =
      bk.barber_name ||
      bk["Barbeiro"] ||
      "—";


    const bookingDate =
      bk.booking_date ||
      bk["Data"];


    const bookingTime =
      bk.booking_time ||
      bk["Hora"];


    const dt =
      RG.parseISO(
        bookingDate
      );


    body.innerHTML = `
      <div class="b-success">

        <span class="suc-ic">
          ${window.RGICONS.check}
        </span>

        <h3>
          Marcação
          <em>confirmada</em>
        </h3>

        <p>
          Obrigado! A tua marcação foi
          registada com sucesso.
        </p>


        <div class="b-summary suc-card">

          <div class="sum-row">

            <span class="k">
              Serviço
            </span>

            <span class="v">
              ${esc(service)}
            </span>

          </div>


          <div class="sum-row">

            <span class="k">
              Barbeiro
            </span>

            <span class="v">
              ${esc(barber)}
            </span>

          </div>


          <div class="sum-row">

            <span class="k">
              Data
            </span>

            <span class="v">

              ${dt
                .getDate()
                .toString()
                .padStart(2, "0")}/${(
                dt.getMonth() + 1
              )
                .toString()
                .padStart(2, "0")}/${dt.getFullYear()}

            </span>

          </div>


          <div class="sum-row">

            <span class="k">
              Hora
            </span>

            <span class="v">
              ${esc(bookingTime)}
            </span>

          </div>

        </div>


        <span class="suc-ref">
          Referência ·
          ${esc(
            bk.reference ||
            bk.id ||
            ""
          )}
        </span>


        <div
          class="suc-actions"
          style="margin-top:22px"
        >

          <button
            type="button"
            class="btn btn-gold"
            id="goBookings"
          >
            ${window.RGICONS.calendar}
            Ver minhas marcações
          </button>


          <button
            type="button"
            class="btn btn-outline"
            id="closeBooking"
          >
            Fechar
          </button>

        </div>

      </div>
    `;


    body
      .querySelector("#goBookings")
      ?.addEventListener(
        "click",
        () => {

          close();

          window.location.href =
            "profile.html#minhas-marcacoes";
        }
      );


    body
      .querySelector("#closeBooking")
      ?.addEventListener(
        "click",
        close
      );
  }


  /* ========================================================
     CONFIRMAR MARCAÇÃO
     ======================================================== */

  async function confirmBooking() {

    if (state.submitting) return;


    state.submitting = true;


    nextBtn.disabled = true;


    nextBtn.innerHTML = `
      <span
        class="spinner"
        style="
          width:18px;
          height:18px;
          border-width:2px
        "
      ></span>

      <span>
        A confirmar…
      </span>
    `;


    const barberName =
      state.barber
        ? state.barber.name
        : "Sem preferência";


    /*
     * Verificação final.
     */
    try {

      const taken =
        await Store.getTakenSlots(
          state.date
        );


      const clash =
        state.barber
          ? taken.some(
              (x) =>
                String(
                  x.booking_time
                ).slice(0, 5) ===
                  String(
                    state.time
                  ).slice(0, 5) &&
                x.barber_name ===
                  barberName
            )
          : taken.some(
              (x) =>
                String(
                  x.booking_time
                ).slice(0, 5) ===
                String(
                  state.time
                ).slice(0, 5)
            );


      if (clash) {

        window.showToast(
          "Este horário acabou de ficar ocupado. Escolhe outro.",
          "error"
        );


        state.time = null;

        state.submitting = false;

        state.step = 3;

        return render();
      }

    } catch (err) {

      console.warn(
        "Verificação de disponibilidade falhou:",
        err
      );
    }


    try {

      const booking =
        await Store.create({

          service_name:
            state.service.name,

          barber_name:
            barberName,

          booking_date:
            state.date,

          booking_time:
            state.time,

          nome:
            state.nome.trim(),

          email:
            state.email,
        });


      /*
       * Atualiza perfil.
       */
      try {

        await window.Auth.updateProfile({

          nome:
            state.nome.trim(),

          telefone:
            state.telefone.trim(),
        });

      } catch (err) {

        console.warn(
          "Update profile falhou:",
          err?.message
        );
      }


      state.lastBooking =
        booking;

      state.step = 6;

      state.submitting = false;


      window.showToast(
        "Marcação confirmada com sucesso!",
        "success"
      );


      render();


    } catch (err) {

      console.error(
        "create booking error:",
        err
      );


      state.submitting = false;


      window.showToast(
        "Não foi possível confirmar a marcação. Tenta novamente.",
        "error"
      );


      render();
    }
  }


  /* ========================================================
     ESCAPE
     ======================================================== */

  function esc(s) {

    return String(
      s ?? ""
    ).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c]
    );
  }


  /* ========================================================
     EXPOSIÇÃO
     ======================================================== */

  window.BookingFlow = {
    open,
    close,
    init,
  };


  document.addEventListener(
    "DOMContentLoaded",
    init
  );

})();
