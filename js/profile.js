/* ============================================================
   Barbearia RickGino — profile.js
   Painel de perfil: visão geral, perfil, marcações, histórico,
   definições e cancelamento (com confirmação).
   ============================================================ */

"use strict";

(function () {
  const RG = window.RG;
  const Auth = window.Auth;
  const Store = window.BookingsStore;

  const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  let view = "visao-geral";
  let historyFilter = "all";
  let bookingsCache = null;
  let cancelTarget = null;

  const views = {
    "visao-geral": { label: "Visão geral", icon: "layout" },
    "meu-perfil": { label: "Meu perfil", icon: "user" },
    "minhas-marcacoes": { label: "Minhas marcações", icon: "calendar" },
    historico: { label: "Histórico", icon: "history" },
    definicoes: { label: "Definições", icon: "settings" },
  };

  /* ---------- helpers de formatação ---------- */
  function fmtDate(iso) {
    const d = RG.parseISO(iso);
    return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
  }
  function fmtDateShort(iso) {
    const d = RG.parseISO(iso);
    return { day: d.getDate().toString().padStart(2, "0"), mon: MONTHS_PT[d.getMonth()], full: fmtDate(iso) };
  }

  function statusOf(b) {
    const today = RG.toISODate(new Date());
    const isPast = String(b.booking_date) < today;
    if (b.status === "cancelled") return { label: "Cancelada", cls: "status-cancelled", cat: "cancelled" };
    if (b.status === "completed") return { label: "Concluída", cls: "status-completed", cat: "completed" };
    if (b.status === "confirmed" && isPast) return { label: "Concluída", cls: "status-completed", cat: "completed" };
    return { label: "Confirmada", cls: "status-confirmed", cat: "upcoming" };
  }

  function avatarHtml(profile) {
    if (!profile) return `<span class="user-avatar">${RG.initials("?")}</span>`;
    const src = profile.avatar_url || "";
    return `<span class="user-avatar">${src ? `<img src="${RG.esc(src)}" alt="">` : RG.initials(profile.nome || "U")}</span>`;
  }

  function bookingItemHtml(b, opts = {}) {
    const st = statusOf(b);
    const d = fmtDateShort(b.booking_date);
    return `
      <div class="bk-item">
        <div class="bk-date"><b>${d.day}</b><span>${d.mon}</span></div>
        <div class="bk-info">
          <h4>${RG.esc(b.service_name)}</h4>
          <div class="bk-meta">
            <span>${RGICONS.user}${RG.esc(b.barber_name)}</span>
            <span>${RGICONS.clock}${RG.esc(b.booking_time)}</span>
            <span>${RGICONS.calendar}${RG.esc(d.full)}</span>
          </div>
        </div>
        <div class="bk-side">
          <span class="status-pill ${st.cls}">${st.label}</span>
          <span class="bk-ref">${RG.esc(b.reference || "")}</span>
          ${!opts.hideCancel && b.status === "confirmed" && String(b.booking_date) >= RG.toISODate(new Date()) ? `<button type="button" class="btn-cancel" data-cancel="${RG.esc(b.id)}">Cancelar marcação</button>` : ""}
        </div>
      </div>`;
  }

  function emptyState(title, text, withCta = true) {
    return `
      <div class="empty-state">
        <span class="es-ic">${RGICONS.calendarX}</span>
        <h4>${RG.esc(title)}</h4>
        <p>${RG.esc(text)}</p>
        ${withCta ? `<button type="button" class="btn btn-gold btn-sm" data-book>Fazer uma marcação</button>` : ""}
      </div>`;
  }

  function skeletonHtml() {
    return `
      <div class="pm-skeleton">
        <div class="skel-block skeleton"></div>
        <div class="skel-line w70 skeleton"></div>
        <div class="skel-line w40 skeleton"></div>
        <div class="skel-line w90 skeleton"></div>
        <div class="skel-line w60 skeleton"></div>
      </div>`;
  }

  /* ---------- Navegação ---------- */
  function setActiveNav() {
    document.querySelectorAll(".ps-nav button[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    const heads = {
      "visao-geral": ["Visão geral", "O teu espaço na RickGino"],
      "meu-perfil": ["Meu perfil", "Os teus dados e preferências"],
      "minhas-marcacoes": ["Minhas marcações", "A tua próxima marcação"],
      historico: ["Histórico", "Todas as tuas marcações"],
      definicoes: ["Definições", "Gestão da tua conta"],
    };
    const h = heads[view] || [];
    const t = document.getElementById("pmTitle");
    const s = document.getElementById("pmSub");
    if (t) t.textContent = h[0] || "";
    if (s) s.textContent = h[1] || "";
  }

  function switchView(name) {
    view = name;
    setActiveNav();
    window.location.hash = name;
    renderView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Rendering ---------- */
  async function renderView() {
    const wrap = document.getElementById("pmView");
    if (!wrap) return;

    if (!Auth.isLoggedIn()) {
      renderLoginRequired(wrap);
      return;
    }

    wrap.innerHTML = skeletonHtml();
    const profile = await Auth.getProfile().catch(() => null);
    if (!profile) {
      renderLoginRequired(wrap);
      return;
    }
    updateSidebarUser(profile);
    if (view === "visao-geral") return renderOverview(wrap, profile);
    if (view === "meu-perfil") return renderProfile(wrap, profile);
    if (view === "minhas-marcacoes") return renderUpcoming(wrap, profile);
    if (view === "historico") return renderHistory(wrap, profile);
    if (view === "definicoes") return renderSettings(wrap, profile);
  }

  function updateSidebarUser(profile) {
    const el = document.getElementById("psUser");
    if (!el) return;
    const src = profile.avatar_url || "";
    el.innerHTML = `
      <span class="user-avatar">${src ? `<img src="${RG.esc(src)}" alt="">` : RG.initials(profile.nome || "U")}</span>
      <div><b>${RG.esc(profile.nome || "")}</b><span>${RG.esc(profile.email || "")}</span></div>`;
  }

  function renderLoginRequired(wrap) {    wrap.innerHTML = `
      <div class="panel">
        <div class="empty-state">
          <span class="es-ic">${RGICONS.user}</span>
          <h4>Inicia sessão</h4>
          <p>Entra com a tua conta Google para veres o teu perfil e as tuas marcações.</p>
          <button type="button" class="btn btn-gold" id="loginBtn">${RGICONS.google} Continuar com Google</button>
        </div>
      </div>`;
    wrap.querySelector("#loginBtn").addEventListener("click", () =>
      Auth.signInWithGoogle().catch(() => window.showToast("Login falhou. Tenta novamente.", "error"))
    );
  }

  /* --- Visão geral --- */
  async function renderOverview(wrap, profile) {
    const all = (bookingsCache = await Store.listAll().catch(() => []));
    const upcoming = all
      .filter((b) => b.status === "confirmed" && String(b.booking_date) >= RG.toISODate(new Date()))
      .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time));
    const next = upcoming[0] || null;
    const total = all.length;
    const completed = all.filter((b) => statusOf(b).cat === "completed");
    const last = completed.sort((a, b) => (b.booking_date + (b.booking_time || "")).localeCompare(a.booking_date + (a.booking_time || "")))[0];
    const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }) : "—";

    wrap.innerHTML = `
      <div class="profile-hero">
        <span class="ph-avatar">${profile.avatar_url ? `<img src="${RG.esc(profile.avatar_url)}" alt="">` : RG.initials(profile.nome)}</span>
        <div class="ph-info">
          <h2>${RG.esc(profile.nome)}</h2>
          <p>${RG.esc(profile.email)}</p>
          <span class="ph-badge">${RGICONS.check}Membro desde ${RG.esc(memberSince)}</span>
        </div>
      </div>

      <div class="pm-grid">
        <div class="stat-card">
          <span class="sc-ic">${RGICONS.calendarCheck}</span>
          <span class="sc-val">${next ? `${fmtDateShort(next.booking_date).day} ${RG.esc(fmtDateShort(next.booking_date).mon)}` : "—"}</span>
          <span class="sc-label">Próxima marcação</span>
          <span class="sc-note">${next ? `${RG.esc(next.service_name)} · ${RG.esc(next.booking_time)}` : "Sem marcações futuras"}</span>
        </div>
        <div class="stat-card">
          <span class="sc-ic">${RGICONS.calendar}</span>
          <span class="sc-val">${total}</span>
          <span class="sc-label">Total de marcações</span>
          <span class="sc-note">desde a criação da conta</span>
        </div>
        <div class="stat-card">
          <span class="sc-ic">${RGICONS.history}</span>
          <span class="sc-val">${last ? fmtDateShort(last.booking_date).day : "—"}</span>
          <span class="sc-label">Última visita</span>
          <span class="sc-note">${last ? `${RG.esc(last.service_name)}` : "Ainda não visitou"}</span>
        </div>
      </div>

      <div class="panel">
        <h3>${RGICONS.calendarCheck} Próxima marcação</h3>
        ${next ? bookingItemHtml(next) : emptyState("Não tens nenhuma marcação.", "Reserva um horário na Barbearia RickGino.")}
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.location.href='profile.html#minhas-marcacoes'">${RGICONS.calendar} Ver marcações</button>
          <button type="button" class="btn btn-gold btn-sm" data-book>Nova marcação</button>
        </div>
      </div>`;

    bindCancelButtons();
  }

  /* --- Meu perfil --- */
  async function renderProfile(wrap, profile) {
    wrap.innerHTML = `
      <div class="profile-hero">
        <span class="ph-avatar">${profile.avatar_url ? `<img src="${RG.esc(profile.avatar_url)}" alt="">` : RG.initials(profile.nome)}</span>
        <div class="ph-info">
          <h2>${RG.esc(profile.nome)}</h2>
          <p>${RG.esc(profile.email)}</p>
          <span class="ph-badge">${RGICONS.google} Conta Google</span>
        </div>
      </div>

      <div class="panel">
        <h3>${RGICONS.user} Dados pessoais</h3>
        <form class="profile-form" id="profileForm">
          <div class="field">
            <label for="pfNome">Nome</label>
            <input id="pfNome" type="text" value="${RG.esc(profile.nome)}" required>
          </div>
          <div class="field">
            <label for="pfTel">Telefone</label>
            <input id="pfTel" type="tel" value="${RG.esc(profile.telefone || "")}" placeholder="+351 ...">
          </div>
          <div class="full ro-info">
            <span class="ro-ic">${RGICONS.mail}</span>
            <div><b>Email</b><span>${RG.esc(profile.email)} · gerido pela tua conta Google</span></div>
          </div>
          <div class="full ro-info">
            <span class="ro-ic">${RGICONS.clock}</span>
            <div><b>Conta criada a</b><span>${new Date(profile.created_at || Date.now()).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
          </div>
          <div class="full">
            <button type="submit" class="btn btn-gold" id="saveProfile">${RGICONS.check} Guardar alterações</button>
          </div>
        </form>
      </div>`;

    const form = wrap.querySelector("#profileForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = form.querySelector("#pfNome").value.trim();
      const telefone = form.querySelector("#pfTel").value.trim();
      const btn = form.querySelector("#saveProfile");
      if (!nome) return window.showToast("O nome não pode estar vazio.", "error");
      btn.disabled = true;
      btn.textContent = "A guardar…";
      try {
        await Auth.updateProfile({ nome, telefone });
        window.showToast("Perfil atualizado com sucesso.", "success");
        renderView();
      } catch (err) {
        console.error(err);
        window.showToast("Não foi possível guardar. Tenta novamente.", "error");
        btn.disabled = false;
        btn.textContent = "Guardar alterações";
      }
    });
  }

  /* --- Minhas marcações (próximas) --- */
  async function renderUpcoming(wrap, profile) {
    const all = (bookingsCache = await Store.listAll().catch(() => []));
    const upcoming = all
      .filter((b) => b.status === "confirmed" && String(b.booking_date) >= RG.toISODate(new Date()))
      .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time));

    wrap.innerHTML = `
      <div class="panel">
        <h3>${RGICONS.calendarCheck} Próximas marcações</h3>
        <div class="booking-list">
          ${upcoming.length ? upcoming.map((b) => bookingItemHtml(b)).join("") : emptyState("Não tens nenhuma marcação.", "Reserva um horário na Barbearia RickGino.")}
        </div>
        ${upcoming.length ? "" : `<div style="text-align:center"><button type="button" class="btn btn-gold" data-book>Fazer uma marcação</button></div>`}
      </div>`;

    bindCancelButtons();
  }

  /* --- Histórico --- */
  async function renderHistory(wrap, profile) {
    const all = (bookingsCache = await Store.listAll().catch(() => []));
    const cats = {
      all: all,
      upcoming: all.filter((b) => statusOf(b).cat === "upcoming"),
      completed: all.filter((b) => statusOf(b).cat === "completed"),
      cancelled: all.filter((b) => statusOf(b).cat === "cancelled"),
    };
    const list = [...cats[historyFilter]].sort((a, b) =>
      (b.booking_date + (b.booking_time || "")).localeCompare(a.booking_date + (a.booking_time || ""))
    );
    const chips = [
      ["all", "Todas"],
      ["upcoming", "Próximas"],
      ["completed", "Concluídas"],
      ["cancelled", "Canceladas"],
    ];

    wrap.innerHTML = `
      <div class="panel">
        <h3>${RGICONS.history} Histórico de marcações</h3>
        <div class="filter-bar">
          ${chips
            .map(
              ([k, label]) =>
                `<button type="button" class="filter-chip ${historyFilter === k ? "active" : ""}" data-filter="${k}">${label}${k === "all" ? ` <span style="opacity:.6">(${all.length})</span>` : ""}</button>`
            )
            .join("")}
        </div>
        <div class="booking-list">
          ${list.length ? list.map((b) => bookingItemHtml(b, { hideCancel: true })).join("") : emptyState("Sem marcações nesta categoria.", historyFilter === "all" ? "Ainda não fizeste nenhuma marcação." : "Ainda não existe nada aqui.", historyFilter === "all")}
        </div>
      </div>`;

    wrap.querySelectorAll(".filter-chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        historyFilter = chip.dataset.filter;
        renderHistory(wrap, profile);
      })
    );
  }

  /* --- Definições --- */
  function renderSettings(wrap, profile) {
    wrap.innerHTML = `
      <div class="settings-section">
        <h4>Conta</h4>
        <div class="setting-row">
          <div class="sr-info"><b>Email</b><span>${RG.esc(profile.email)}</span></div>
          <span class="sr-badge">Google</span>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>Avatar</b><span>Foto da tua conta Google</span></div>
          ${avatarHtml(profile)}
        </div>
      </div>

      <div class="settings-section">
        <h4>Dados pessoais</h4>
        <form class="profile-form" id="settingsForm">
          <div class="field">
            <label for="stNome">Nome</label>
            <input id="stNome" type="text" value="${RG.esc(profile.nome)}" required>
          </div>
          <div class="field">
            <label for="stTel">Telefone</label>
            <input id="stTel" type="tel" value="${RG.esc(profile.telefone || "")}" placeholder="+351 ...">
          </div>
          <div class="full">
            <button type="submit" class="btn btn-gold" id="saveSettings">${RGICONS.check} Guardar</button>
          </div>
        </form>
      </div>

      <div class="settings-section">
        <h4>Em breve</h4>
        <div class="setting-row"><div class="sr-info"><b>Notificações</b><span>Lembretes por email e SMS</span></div><span class="sr-badge">Em breve</span></div>
        <div class="setting-row"><div class="sr-info"><b>Preferências</b><span>Barbeiro favorito, lembretes</span></div><span class="sr-badge">Em breve</span></div>
        <div class="setting-row"><div class="sr-info"><b>Eliminar conta</b><span>Apagar a conta e os teus dados</span></div><span class="sr-badge">Em breve</span></div>
      </div>

      <div class="settings-section">
        <h4>Sessão</h4>
        <div class="setting-row">
          <div class="sr-info"><b>Terminar sessão</b><span>Sair desta conta</span></div>
          <button type="button" class="btn btn-outline btn-sm" id="logoutBtn">${RGICONS.logout} Sair</button>
        </div>
      </div>`;

    const form = wrap.querySelector("#settingsForm");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nome = form.querySelector("#stNome").value.trim();
      const telefone = form.querySelector("#stTel").value.trim();
      const btn = form.querySelector("#saveSettings");
      if (!nome) return window.showToast("O nome não pode estar vazio.", "error");
      btn.disabled = true;
      btn.textContent = "A guardar…";
      try {
        await Auth.updateProfile({ nome, telefone });
        window.showToast("Definições atualizadas.", "success");
        renderView();
      } catch (err) {
        console.error(err);
        window.showToast("Não foi possível guardar.", "error");
        btn.disabled = false;
        btn.textContent = "Guardar";
      }
    });

    wrap.querySelector("#logoutBtn").addEventListener("click", async () => {
      await Auth.signOut();
      window.showToast("Sessão terminada.", "info");
      window.location.href = "index.html";
    });
  }

  /* ---------- Cancelamento (com confirmação) ---------- */
  function bindCancelButtons() {
    document.querySelectorAll("[data-cancel]").forEach((btn) =>
      btn.addEventListener("click", () => {
        cancelTarget = btn.dataset.cancel;
        openConfirm();
      })
    );
  }

  function openConfirm() {
    const b = bookingsCache?.find((x) => String(x.id) === String(cancelTarget));
    const modal = document.getElementById("confirmModal");
    if (!modal) return;
    const detail = modal.querySelector("#confirmDetail");
    if (detail && b) detail.textContent = `${b.service_name} · ${fmtDate(b.booking_date)} às ${b.booking_time}`;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeConfirm() {
    const modal = document.getElementById("confirmModal");
    if (modal) modal.classList.remove("open");
    document.body.style.overflow = "";
    cancelTarget = null;
  }

  async function doCancel() {
    const btn = document.getElementById("confirmBtn");
    if (!btn || !cancelTarget) return;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> A cancelar…`;
    try {
      await Store.cancel(cancelTarget);
      closeConfirm();
      bookingsCache = null;
      window.showToast("Marcação cancelada com sucesso.", "success");
      renderView();
    } catch (err) {
      console.error(err);
      window.showToast("Não foi possível cancelar. Tenta novamente.", "error");
      btn.disabled = false;
      btn.textContent = "Confirmar cancelamento";
    }
  }

  /* ---------- Demo banner ---------- */
  function initDemoBanner() {
    const slot = document.getElementById("demoBanner");
    if (!slot || !Auth.isDemo()) return;
    slot.innerHTML = `${RGICONS.info}<span><b>Modo demonstração.</b> Configura o Supabase em <code>js/config.js</code> para ativar o login real com Google, o perfil e as marcações.</span>`;
  }

  /* ---------- Init ---------- */
  function init() {
    const hash = window.location.hash.replace("#", "");
    if (views[hash]) view = hash;
    setActiveNav();
    initDemoBanner();

    document.querySelectorAll(".ps-nav button[data-view]").forEach((btn) =>
      btn.addEventListener("click", () => switchView(btn.dataset.view))
    );
    document.getElementById("psLogout")?.addEventListener("click", async () => {
      await Auth.signOut();
      window.location.href = "index.html";
    });
    document.getElementById("confirmCancel")?.addEventListener("click", closeConfirm);
    document.getElementById("confirmBtn")?.addEventListener("click", doCancel);
    const overlay = document.getElementById("confirmModal");
    if (overlay) overlay.addEventListener("click", (e) => e.target === overlay && closeConfirm());

    // abre a view correta quando o hash muda (ex: vindo da marcação)
    window.addEventListener("hashchange", () => {
      const h = window.location.hash.replace("#", "");
      if (views[h]) {
        view = h;
        setActiveNav();
        renderView();
      }
    });

    Auth.setOnAuthChange(() => renderView());
    renderView();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
