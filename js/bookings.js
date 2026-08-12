```javascript
/* ============================================================
   Barbearia RickGino — bookings.js
   Fluxo de marcação em 7 passos + camada de dados das
   marcações ligada à tabela "booking" do Supabase.
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
        .from("booking")
        .select("*")
        .eq("used_id", user.id)
        .order("Data", { ascending: false });

      if (error) throw error;

      return (data || []).map(normalizeBooking);
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
          (a.booking_date + b.booking_time).localeCompare(
            b.booking_date + a.booking_time
          )
        );
    },

    async byId(id) {
      const all = await Store.listAll();

      return (
        all.find(
          (b) => String(b.id) === String(id)
        ) || null
      );
    },

    async create(payload) {
      const auth = window.Auth;
      const user = auth.getUser();

      if (!user) {
        throw new Error("Utilizador não autenticado.");
      }

      const reference = genReference();

      /* ================= DEMO ================= */

      if (auth.isDemo()) {
        const all = JSON.parse(
          localStorage.getItem("rg_bookings") || "[]"
        );

        const now = new Date().toISOString();

        const rec = {
          id:
            "bk_" +
            Math.random().toString(36).slice(2, 12),

          user_id: user.id,

          service_name: payload.service_name,
          barber_name: payload.barber_name,
          booking_date: payload.booking_date,
          booking_time: payload.booking_time,

          status: "confirmed",

          reference,

          created_at: now,
          updated_at: now
        };

        all.push(rec);

        localStorage.setItem(
          "rg_bookings",
          JSON.stringify(all)
        );

        return rec;
      }

      /* ================= SUPABASE ================= */

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
            "used_id": user.id
          }
        ])
        .select()
        .single();

      if (error) {
        console.error(
          "Erro ao criar marcação no Supabase:",
          error
        );

        throw error;
      }

      return {
        ...normalizeBooking(data),
        reference
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
        .from("booking")
        .update({
          "Status": "cancelada"
        })
        .eq("id", id)
        .eq("used_id", auth.getUser().id)
        .select()
        .single();

      if (error) throw error;

      return normalizeBooking(data);
    },

    /* ======================================================
       HORÁRIOS OCUPADOS
       ====================================================== */

    async getTakenSlots(dateISO) {
      const auth = window.Auth;

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
            barber_name: b.barber_name
          }));
      }

      try {
        const { data, error } = await auth
          .getClient()
          .from("booking")
          .select('"Hora","Barbeiro","Status"')
          .eq('"Data"', dateISO)
          .neq('"Status"', "cancelada");

        if (error) throw error;

        return (data || []).map((b) => ({
          booking_time: normalizeTime(b["Hora"]),
          barber_name: b["Barbeiro"] || ""
        }));
      } catch (err) {
        console.error(
          "Erro ao consultar horários:",
          err
        );

        return [];
      }
    }
  };

  /* ========================================================
     NORMALIZAÇÃO
     ======================================================== */

  function normalizeBooking(row) {
    if (!row) return null;

    return {
      id: row.id,

      user_id: row.used_id,

      service_name: row["Serviço"] || "",
      barber_name: row["Barbeiro"] || "",

      booking_date: row["Data"] || null,
      booking_time: normalizeTime(row["Hora"]),

      status: normalizeStatus(row["Status"]),

      nome: row["Nome"] || "",
      email: row["E-mail"] || "",

      created_at: row.created_at || null
    };
  }

  function normalizeStatus(status) {
    if (status === "confirmada") return "confirmed";
    if (status === "cancelada") return "cancelled";
    if (status === "pendente") return "pending";

    return status || "pending";
  }

  function normalizeTime(value) {
    if (!value) return "";

    const str = String(value);

    return str.length >= 5
      ? str.substring(0, 5)
      : str;
  }

  function genReference() {
    const chars =
      "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    let r = "";

    for (let i = 0; i < 6; i++) {
      r +=
        chars[
          Math.floor(
            Math.random() * chars.length
          )
        ];
    }

    const d = new Date();

    return `RG${String(
      d.getFullYear()
    ).slice(2)}${String(
      d.getMonth() + 1
    ).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}-${r}`;
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
    "Confirmado"
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

    lastBooking: null
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

      state.noBarberPref =
        !state.barber;
    }

    if (!modal) return;

    modal.classList.add("open");

    document.body.style.overflow =
      "hidden";

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

  function render() {
    if (!body) return;

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
      stepSuccess
    ];

    try {
      renderers[s]();
    } catch (err) {
      console.error(
        "Erro ao carregar passo:",
        err
      );

      body.innerHTML = `
        <div style="padding:25px;text-align:center">
          <p>Não foi possível carregar este passo.</p>
          <small>${esc(
            err?.message || ""
          )}</small>
        </div>
      `;

      return;
    }

    foot.style.display =
      s === 6 ? "none" : "flex";

    backBtn.style.visibility =
      s === 0
        ? "hidden"
        : "visible";

    if (s === 5) {
      nextBtn.innerHTML =
        `${window.RGICONS.check}
         <span>Confirmar marcação</span>`;

      nextBtn.disabled =
        state.submitting;
    } else {
      nextBtn.innerHTML =
        `Continuar ${window.RGICONS.arrowRight}`;

      nextBtn.disabled = false;
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
        'Escolhe um barbeiro ou "Sem preferência".',
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
      await confirmBooking();
      return;
    }

    state.step++;

    if (state.step === 4) {
      await refreshStepData();
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
      .querySelectorAll(
        ".service-opt"
      )
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
              .forEach((b) =>
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
    body.innerHTML = `
      <div class="barber-options">

        <button
          type="button"
          class="barber-opt ${
            state.noBarberPref
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
      .querySelectorAll(
        ".barber-opt"
      )
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
              .forEach((b) =>
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
    const days = [];

    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 2,
      0
    );

    const totalDays =
      Math.max(
        D.bookingDaysAhead || 31,
        end.getDate()
      );

    for (
      let i = 0;
      i < totalDays;
      i++
    ) {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        1 + i
      );

      const iso =
        RG.toISODate(d);

      const dow =
        d.getDay();

      const closed =
        (D.bookingClosedWeekdays ||
          []
        ).includes(dow);

      const passed =
        d <
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

      days.push({
        date: iso,
        dow,
        closed,
        passed
      });
    }

    const dowNames = [
      "Dom",
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb"
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
      "Dez"
    ];

    body.innerHTML = `
      <div class="date-options">

        ${days
          .map((d) => {
            const dt =
              RG.parseISO(
                d.date
              );

            const disabled =
              d.closed ||
              d.passed;

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
                  disabled
                    ? "disabled"
                    : ""
                }"
                data-date="${d.date}"
                ${
                  disabled
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
        Os dias anteriores e os dias
        encerrados ficam bloqueados.
      </p>
    `;

    body
      .querySelectorAll(
        ".date-opt:not([disabled])"
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
              .forEach((b) =>
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
      console.error(err);
      state.taken = [];
    }

    const taken =
      state.taken || [];

    const slots =
      D.bookingSlots || [];

    const timeTaken = (t) =>
      state.barber
        ? taken.some(
            (x) =>
              normalizeTime(
                x.booking_time
              ) === t &&
              x.barber_name ===
                state.barber.name
          )
        : taken.some(
            (x) =>
              normalizeTime(
                x.booking_time
              ) === t
          );

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
                data-time="${t}"
                ${
                  occupied
                    ? "disabled"
                    : ""
                }
              >
                ${t}
              </button>
            `;
          })
          .join("")}

      </div>
    `;

    body
      .querySelectorAll(
        ".time-opt:not([disabled])"
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
              .forEach((b) =>
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
     PASSO 6 — RESUMO
     ======================================================== */

  function stepSummary() {
    if (
      !state.service ||
      !state.date ||
      !state.time
    ) {
      body.innerHTML = `
        <div style="padding:25px;text-align:center">
          <p>
            Falta selecionar algum dado da marcação.
          </p>
        </div>
      `;

      return;
    }

    const dt =
      RG.parseISO(
        state.date
      );

    const b =
      state.barber || {
        name: "Sem preferência"
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
              ${
                state.service
                  .duration
              } min
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
              .padStart(
                2,
                "0"
              )}/${(
              dt.getMonth() +
              1
            )
              .toString()
              .padStart(
                2,
                "0"
              )}/${dt.getFullYear()}
          </span>
        </div>

        <div class="sum-row">
          <span class="k">
            Hora
          </span>

          <span class="v">
            ${esc(
              state.time
            )}
          </span>
        </div>

        <div class="sum-row">
          <span class="k">
            Nome
          </span>

          <span class="v">
            ${esc(
              state.nome
            )}
          </span>
        </div>

        <div class="sum-row sum-total">
          <span class="k">
            Total
          </span>

          <span class="v">
            ${
              state.service
                .price
            }€
          </span>
        </div>

      </div>
    `;
  }

  /* ========================================================
     PASSO 7 — SUCESSO
     ======================================================== */

  function stepSuccess() {
    const bk =
      state.lastBooking;

    if (!bk) {
      body.innerHTML = `
        <div style="padding:25px;text-align:center">
          <p>
            Marcação não encontrada.
          </p>
        </div>
      `;

      return;
    }

    const b =
      bk.barber_name ||
      "Sem preferência";

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
          Obrigado! A tua marcação foi
          registada com sucesso.
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
                .padStart(
                  2,
                  "0"
                )}/${(
                dt.getMonth() +
                1
              )
                .toString()
                .padStart(
                  2,
                  "0"
                )}/${dt.getFullYear()}
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
                normalizeTime(
                  x.booking_time
                ) ===
                  state.time &&
                x.barber_name ===
                  barberName
            )
          : taken.some(
              (x) =>
                normalizeTime(
                  x.booking_time
                ) ===
                state.time
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
      const user =
        window.Auth.getUser();

      const booking =
        await Store.create({
          nome:
            state.nome.trim(),

          email:
            state.email.trim(),

          service_name:
            state.service.name,

          barber_name:
            barberName,

          booking_date:
            state.date,

          booking_time:
            state.time
        });

      /* Atualiza perfil */

      try {
        await window.Auth.updateProfile(
          {
            nome:
              state.nome.trim(),

            telefone:
              state.telefone.trim()
          }
        );
      } catch (err) {
        console.warn(
          "Update profile falhou:",
          err
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

      nextBtn.disabled =
        false;

      window.showToast(
        "Não foi possível confirmar a marcação. Tenta novamente.",
        "error"
      );

      render();
    }
  }

  /* ========================================================
     ESC
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
          "'": "&#039;"
        })[c]
    );
  }

  /* ========================================================
     EXPOSIÇÃO
     ======================================================== */

  window.BookingFlow = {
    open,
    close,
    init
  };

  document.addEventListener(
    "DOMContentLoaded",
    init
  );
})();
```
