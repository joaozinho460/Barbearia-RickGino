/* ============================================================
   Barbearia RickGino — bookings.js
   Fluxo de marcação em 7 passos + camada de dados das
   marcações (utilizada pelo wizard e pelo painel de perfil).
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

        return all.filter((b) => b.user_id === prof.id);
      }

      const user = auth.getUser();
      if (!user) return [];

      const { data, error } = await auth
        .getClient()
        .from("bookings")
        .select("*")
        .order("booking_date", { ascending: false });

      if (error) throw error;

      return data || [];
    },

    async upcoming() {
      const all = await Store.listAll();
      const today = RG.toISODate(new Date());

      return all
        .filter(
          (b) =>
            b.status === "confirmed" &&
            String(b.booking_date) >= today
        )
        .sort((a, b) =>
          (a.booking_date + a.booking_time).localeCompare(
            b.booking_date + b.booking_time
          )
        );
    },

    async byId(id) {
      const all = await Store.listAll();

      return (
        all.find((b) => String(b.id) === String(id)) || null
      );
    },

    async create(payload) {
      const auth = window.Auth;
      const reference = genReference();

      /* ---------------- DEMO ---------------- */

      if (auth.isDemo()) {
        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        const now = new Date().toISOString();

        const rec = {
          id:
            "bk_" +
            Math.random().toString(36).slice(2, 12),

          user_id: auth.getUser().id,

          service_name: payload.service_name,

          barber_name: payload.barber_name,

          booking_date: payload.booking_date,

          booking_time: payload.booking_time,

          status: "confirmed",

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

      /* ---------------- SUPABASE ---------------- */

      const user = auth.getUser();

      if (!user) {
        throw new Error("Utilizador não autenticado.");
      }

      const { data, error } = await auth
        .getClient()
        .from("bookings")
        .insert([
          {
            user_id: user.id,
            service_name: payload.service_name,
            barber_name: payload.barber_name,
            booking_date: payload.booking_date,
            booking_time: payload.booking_time,
            status: "confirmed",
            reference,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    /* Cancelar: nunca apaga */
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

        all[idx].status = "cancelled";
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
        .from("bookings")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return data;
    },

    /* ======================================================
       HORÁRIOS OCUPADOS
       ====================================================== */

    async getTakenSlots(dateISO) {
      const auth = window.Auth;

      /* ---------------- DEMO ---------------- */

      if (auth.isDemo()) {
        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        return all
          .filter(
            (b) =>
              b.status !== "cancelled" &&
              String(b.booking_date) === dateISO
          )
          .map((b) => ({
            booking_time: b.booking_time,
            barber_name: b.barber_name,
          }));
      }

      /* ---------------- SUPABASE ---------------- */

      try {
        const client = auth.getClient();

        if (!client) {
          return [];
        }

        /*
         * Consulta o RPC.
         *
         * Se o RPC não existir ou der erro,
         * NÃO bloqueamos os horários.
         */

        const result = await Promise.race([
          client.rpc("get_taken_slots", {
            p_date: dateISO,
          }),

          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Timeout na consulta de horários."
                  )
                ),
              5000
            )
          ),
        ]);

        const { data, error } = result;

        if (error) {
          throw error;
        }

        return data || [];
      } catch (err) {
        console.warn(
          "Consulta de horários ocupados falhou:",
          err?.message
        );

        /*
         * IMPORTANTE:
         *
         * Mesmo que o RPC esteja errado/inexistente,
         * os horários continuam aparecendo.
         */

        return [];
      }
    },
  };

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
  };

  let modal,
    body,
    dots,
    foot,
    backBtn,
    nextBtn,
    stepTitle,
    stepLabel;

  /* ========================================================
     OPEN
     ======================================================== */

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

    if (!modal) {
      console.error(
        "bookingModal não encontrado."
      );
      return;
    }

    modal.classList.add("open");

    document.body.style.overflow = "hidden";

    render();
  }

  /* ========================================================
     CLOSE
     ======================================================== */

  function close() {
    if (!modal) return;

    modal.classList.remove("open");

    document.body.style.overflow = "";
  }

  /* ========================================================
     RESET
     ======================================================== */

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
  }

  /* ========================================================
     INIT
     ======================================================== */

  function init() {
    modal =
      document.getElementById("bookingModal");

    if (!modal) return;

    body =
      document.getElementById("bookingStep");

    dots =
      document.getElementById("bookingDots");

    foot =
      document.getElementById("bookingFoot");

    backBtn =
      document.getElementById("bookingBack");

    nextBtn =
      document.getElementById("bookingNext");

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
      ?.addEventListener("click", close);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        modal.classList.contains("open")
      ) {
        close();
      }
    });

    backBtn.addEventListener(
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

    nextBtn.addEventListener(
      "click",
      onNext
    );

    /* Atualiza quando o login muda */

    if (
      window.Auth &&
      typeof window.Auth.setOnAuthChange ===
        "function"
    ) {
      window.Auth.setOnAuthChange(() => {
        if (
          modal.classList.contains("open")
        ) {
          if (state.step === 4) {
            refreshStepData();
          }

          render();
        }
      });
    }
  }

  /* ========================================================
     RENDER
     ======================================================== */

  function render() {
    const s = state.step;

    stepLabel.textContent =
      `Passo ${s + 1} de ${Steps.length}`;

    stepTitle.textContent =
      Steps[s];

    dots.innerHTML = Steps.map(
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

    renderers[s]();

    foot.style.display =
      s === 6 ? "none" : "flex";

    backBtn.style.visibility =
      s === 0 ? "hidden" : "visible";

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

  /* ========================================================
     NEXT
     ======================================================== */

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
      if (
        !window.Auth.isLoggedIn()
      ) {
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

  /* ========================================================
     PROFILE DATA
     ======================================================== */

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
     STEP 1 — SERVIÇO
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
              <span>${s.duration} min</span>
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
      .querySelectorAll(
        ".service-opt"
      )
      .forEach((btn) =>
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
              .forEach((b) =>
                b.classList.toggle(
                  "selected",
                  b === btn
                )
              );
          }
        )
      );
  }

  /* ========================================================
     STEP 2 — BARBEIRO
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
              state.barber?.id ===
              t.id
                ? "selected"
                : ""
            }"
            data-barber="${esc(
              t.id
            )}"
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
      .querySelectorAll(
        ".barber-opt"
      )
      .forEach((btn) =>
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
              .forEach((b) =>
                b.classList.toggle(
                  "selected",
                  b === btn
                )
              );
          }
        )
      );
  }

  /* ========================================================
     STEP 3 — DATA
     ======================================================== */

  function stepDate() {
    const days = [];

    const now = new Date();

    for (
      let i = 0;
      i <
      (D.bookingDaysAhead ||
        14);
      i++
    ) {
      const d =
        RG.addDays(now, i);

      const dow =
        d.getDay();

      const closed =
        (
          D.bookingClosedWeekdays ||
          []
        ).includes(dow);

      days.push({
        date: RG.toISODate(d),
        dow,
        closed,
      });
    }

    const dowNames = [
      "Dom",
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
    ];

    const monNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    body.innerHTML = `
      <div class="date-options">

        ${days
          .map((d) => {
            const dt =
              RG.parseISO(
                d.date
              );

            const sel =
              state.date ===
              d.date;

            return `
              <button
                type="button"
                class="date-opt ${
                  sel
                    ? "selected"
                    : ""
                } ${
                  d.closed
                    ? "disabled"
                    : ""
                }"
                data-date="${d.date}"
                ${
                  d.closed
                    ? "disabled"
                    : ""
                }
              >

                <span class="dow">
                  ${dowNames[d.dow]}
                </span>

                <span class="day">
                  ${dt.getDate()}
                </span>

                <span class="mon">
                  ${monNames[
                    dt.getMonth()
                  ]}
                </span>

              </button>
            `;
          })
          .join("")}

      </div>

      <p
        style="
          color:var(--muted);
          font-size:.8rem;
          margin-top:14px
        "
      >
        ${window.RGICONS.info}
        Os dias encerrados aparecem esbatidos.
      </p>
    `;

    body
      .querySelectorAll(
        ".date-opt:not(.disabled)"
      )
      .forEach((btn) =>
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
              .forEach((b) =>
                b.classList.toggle(
                  "selected",
                  b === btn
                )
              );
          }
        )
      );
  }

  /* ========================================================
     STEP 4 — HORÁRIO
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
          A consultar disponibilidade...
        </p>
      </div>
    `;

    /*
     * Consulta os horários ocupados.
     *
     * Se o Supabase/RPC falhar,
     * getTakenSlots devolve [] e
     * os horários continuam a aparecer.
     */

    try {
      state.taken =
        await Store.getTakenSlots(
          state.date
        );
    } catch (err) {
      state.taken = [];

      console.warn(
        "Erro ao consultar horários:",
        err
      );
    }

    const taken =
      state.taken || [];

    /*
     * Usa os horários definidos no SITE_DATA.
     *
     * Caso D.bookingSlots não exista,
     * utiliza estes como fallback.
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
          ];

    const timeTaken = (t) => {
      if (state.barber) {
        return taken.some(
          (x) =>
            String(
              x.booking_time
            ) === String(t) &&
            x.barber_name ===
              state.barber.name
        );
      }

      return taken.some(
        (x) =>
          String(
            x.booking_time
          ) === String(t)
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
          .map((t) => {
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
                data-time="${esc(
                  t
                )}"
                ${
                  occupied
                    ? "disabled"
                    : ""
                }
              >
                ${esc(t)}
              </button>
            `;
          })
          .join("")}

      </div>
    `;

    body
      .querySelectorAll(
        ".time-opt:not(.disabled)"
      )
      .forEach((btn) =>
        btn.addEventListener(
          "click",
          () => {
            state.time =
              btn.dataset.time;

            body
              .querySelectorAll(
                ".time-opt"
              )
              .forEach((b) =>
                b.classList.toggle(
                  "selected",
                  b === btn
                )
              );
          }
        )
      );
  }

  /* ========================================================
     STEP 5 — DADOS PESSOAIS
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
              .catch(() =>
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
            value="${esc(
              state.nome
            )}"
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
            value="${esc(
              state.telefone
            )}"
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
            value="${esc(
              state.email
            )}"
            disabled
          >

          <span class="hint">
            O email vem da tua conta Google.
          </span>

        </div>

      </div>
    `;

    const iNome =
      body.querySelector(
        "#bkNome"
      );

    const iTel =
      body.querySelector(
        "#bkTel"
      );

    iNome.addEventListener(
      "input",
      () =>
        (state.nome =
          iNome.value)
    );

    iTel.addEventListener(
      "input",
      () =>
        (state.telefone =
          iTel.value)
    );
  }

  /* ========================================================
     STEP 6 — RESUMO
     ======================================================== */

  function stepSummary() {
    const dt =
      RG.parseISO(
        state.date
      );

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
     STEP 7 — CONFIRMAÇÃO
     ======================================================== */

  function stepSuccess() {
    const bk =
      state.lastBooking;

    const b =
      bk.barber_name || "—";

    const dt =
      RG.parseISO(
        bk.booking_date
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
          Obrigado! Enviámos-te a confirmação.
          Vemo-nos na barbearia.
        </p>

        <div class="b-summary suc-card">

          <div class="sum-row">
            <span class="k">
              Serviço
            </span>

            <span class="v">
              ${esc(
                bk.service_name
              )}
            </span>
          </div>

          <div class="sum-row">
            <span class="k">
              Barbeiro
            </span>

            <span class="v">
              ${esc(b)}
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
              ${esc(
                bk.booking_time
              )}
            </span>
          </div>

        </div>

        <span class="suc-ref">
          Referência ·
          ${esc(bk.reference)}
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
      .querySelector(
        "#goBookings"
      )
      .addEventListener(
        "click",
        () => {
          close();

          window.location.href =
            "profile.html#minhas-marcacoes";
        }
      );

    body
      .querySelector(
        "#closeBooking"
      )
      .addEventListener(
        "click",
        close
      );
  }

  /* ========================================================
     CONFIRMAR MARCAÇÃO
     ======================================================== */

  async function confirmBooking() {
    if (state.submitting)
      return;

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

    /* Verificação final */

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
                ) ===
                  String(
                    state.time
                  ) &&
                x.barber_name ===
                  barberName
            )
          : taken.some(
              (x) =>
                String(
                  x.booking_time
                ) ===
                String(
                  state.time
                )
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
        "Verificação final falhou:",
        err
      );
    }

    /* Criar marcação */

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
        });

      /* Atualizar perfil */

      try {
        const prof =
          await window.Auth.getProfile();

        await window.Auth.updateProfile(
          {
            nome:
              state.nome.trim(),

            telefone:
              state.telefone.trim(),
          }
        );

        void prof;
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

      window.showToast(
        "Não foi possível confirmar a marcação. Tenta novamente.",
        "error"
      );

      state.submitting = false;

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
