/* ============================================================
   Barbearia RickGino — auth.js
   Autenticação Supabase (Google OAuth) + perfil do utilizador.

   - Modo real: usa o Supabase quando configurado.
   - Modo demonstração: guarda tudo em localStorage para
     poderes ver o site antes de configurar o Supabase.
   ============================================================ */

"use strict";

(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const url = cfg.SUPABASE_URL || "";
  const key = cfg.SUPABASE_PUBLISHABLE_KEY || "";

  const configured =
    !window.FORCE_DEMO_MODE &&
    typeof supabase !== "undefined" &&
    url !== "" &&
    url !== "YOUR_SUPABASE_URL" &&
    key !== "" &&
    key !== "YOUR_SUPABASE_ANON_KEY";

  const DB = {
    // chaves de localStorage
    profile: "rg_profile",
    bookings: "rg_bookings",
  };

  let client = null;
  let session = null;
  let currentProfile = null;

  /* ---------------- Helpers demo ---------------- */
  function loadLocal(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch {
      return null;
    }
  }
  function saveLocal(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  const demoProfile = () => loadLocal(DB.profile);
  const demoBookings = () => loadLocal(DB.bookings) || [];

  /* ---------------- Supabase helpers ---------------- */
  function initClient() {
    if (client) return client;
    if (!configured) return null;
    try {
      client = supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      return client;
    } catch (err) {
      console.warn("Supabase init falhou:", err);
      return null;
    }
  }

  function getClient() {
    return client || initClient();
  }

  /* ---------------- Estado ---------------- */
  function isDemo() {
    return !configured;
  }

  function isLoggedIn() {
    if (isDemo()) return !!demoProfile();
    return !!session?.user;
  }

  function getUser() {
    if (isDemo()) return demoProfile() || null;
    return session?.user || null;
  }

  /* Perfil normalizado para a UI */
  async function getProfile() {
    if (isDemo()) {
      const p = demoProfile();
      return p
        ? {
            id: p.id,
            nome: p.nome,
            email: p.email,
            telefone: p.telefone || "",
            avatar_url: p.avatar_url || "",
            created_at: p.created_at || new Date().toISOString(),
          }
        : null;
    }

    const user = getUser();
    if (!user) return null;

    // cache
    if (currentProfile && currentProfile.id === user.id) return currentProfile;

    const { data, error } = await getClient()
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("getProfile error:", error);
      return null;
    }

    if (!data) {
      // cria o perfil automaticamente no primeiro login
      const nuevo = {
        id: user.id,
        nome: user.user_metadata?.full_name || user.user_metadata?.name || "Utilizador",
        email: user.email || "",
        telefone: "",
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
      };
      const { data: inserted, error: insErr } = await getClient().from("profiles").upsert(nuevo).select().single();
      if (insErr) {
        console.warn("Criação de perfil falhou:", insErr.message);
        return { ...nuevo, created_at: new Date().toISOString() };
      }
      currentProfile = inserted;
      return currentProfile;
    }

    currentProfile = data;
    return currentProfile;
  }

  async function updateProfile(patch) {
    if (isDemo()) {
      const p = demoProfile();
      if (!p) throw new Error("Sem sessão.");
      const updated = { ...p, ...patch, updated_at: new Date().toISOString() };
      saveLocal(DB.profile, updated);
      return updated;
    }
    const user = getUser();
    if (!user) throw new Error("Sem sessão.");
    const { data, error } = await getClient().from("profiles").update(patch).eq("id", user.id).select().single();
    if (error) throw error;
    currentProfile = data;
    return data;
  }

  /* ---------------- Login / Logout ---------------- */
  async function signInWithGoogle() {
    if (isDemo()) {
      // Simula login com Google (Google Popup simulado)
      const demoUser = {
        id: "demo_" + Math.random().toString(36).slice(2, 10),
        nome: "Utilizador Demo",
        email: "utilizador.demo@gmail.com",
        telefone: "",
        avatar_url: "",
        created_at: new Date().toISOString(),
      };
      saveLocal(DB.profile, demoUser);
      if (!demoBookings().length) {
        // seed de uma marcação para a demo ficar bonita
        const d = new Date();
        d.setDate(d.getDate() + 3);
        saveLocal(DB.bookings, [
          {
            id: "bk_demo_seed",
            user_id: demoUser.id,
            service_name: "Corte + Barba",
            barber_name: "Rick Gino",
            booking_date: window.RG.toISODate(d),
            booking_time: "16:30",
            status: "confirmed",
            reference: "RGD-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      session = { user: demoUser };
      onAuthChange();
      return demoUser;
    }

    const client = getClient();
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (isDemo()) {
      localStorage.removeItem(DB.profile);
      // as marcações demo mantêm-se, mas sem sessão
      session = null;
      currentProfile = null;
      onAuthChange();
      return;
    }
    await getClient().auth.signOut();
    session = null;
    currentProfile = null;
    onAuthChange();
  }

  /* ---------------- UI de autenticação (header / mobile) ---------------- */
  function renderAuthUI() {
    const area = document.getElementById("authArea");
    const mobileArea = document.getElementById("mobileAuth");
    const user = getUser();

    const renderArea = (el, isMobile) => {
      if (!el) return;

      if (!isLoggedIn()) {
        el.innerHTML = `
          <button class="btn btn-gold btn-sm auth-login-btn" type="button">${window.RGICONS.google}<span>Entrar</span></button>
          ${isMobile ? `<a href="#marcacao" class="btn btn-gold btn-sm" data-book>Marcar agora</a>` : ""}`;
        el.querySelector(".auth-login-btn")?.addEventListener("click", () => signInWithGoogle().catch(showAuthError));
        return;
      }

      const name = user?.nome || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Conta";
      const email = user?.email || user?.user_metadata?.email || "";
      const avatar = user?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

      el.innerHTML = `
        ${isMobile ? `<a href="#marcacao" class="btn btn-gold btn-sm" data-book>Marcar agora</a>` : ""}
        <div class="user-box" id="${isMobile ? "mUserBox" : "userBox"}">
          <span class="user-avatar">${avatar ? `<img src="${escapeAttr(avatar)}" alt="">` : window.RG.initials(name)}</span>
          <span class="user-name">${escapeHtml(name)}</span>
          <span class="user-caret"></span>
        </div>
        <div class="user-drop" id="${isMobile ? "mUserDrop" : "userDrop"}">
          <div class="ud-head">
            <span class="user-avatar">${avatar ? `<img src="${escapeAttr(avatar)}" alt="">` : window.RG.initials(name)}</span>
            <div><b>${escapeHtml(name)}</b><span>${escapeHtml(email)}</span></div>
            <button type="button" class="ud-close" aria-label="Fechar menu">✕</button>
          </div>
          <a href="profile.html#visao-geral">${window.RGICONS.layout}<span>Visão geral</span></a>
          <a href="profile.html#meu-perfil">${window.RGICONS.user}<span>Meu perfil</span></a>
          <a href="profile.html#minhas-marcacoes">${window.RGICONS.calendar}<span>Minhas marcações</span></a>
          <a href="profile.html#historico">${window.RGICONS.history}<span>Histórico</span></a>
          <a href="profile.html#definicoes">${window.RGICONS.settings}<span>Definições</span></a>
          <div class="ud-divider"></div>
          <button type="button" class="ud-btn ud-danger auth-logout-btn">${window.RGICONS.logout}<span>Terminar sessão</span></button>
        </div>`;

      const box = el.querySelector(`#${isMobile ? "mUserBox" : "userBox"}`);
      const drop = el.querySelector(`#${isMobile ? "mUserDrop" : "userDrop"}`);
      box.addEventListener("click", (e) => {
        e.stopPropagation();
        drop.classList.toggle("open");
        box.classList.toggle("open");
      });
      document.addEventListener("click", () => {
        drop.classList.remove("open");
        box.classList.remove("open");
      });
      const closeBtn = el.querySelector(".ud-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          drop.classList.remove("open");
          box.classList.remove("open");
        });
      }
      el.querySelector(".auth-logout-btn")?.addEventListener("click", () =>
        signOut().then(() => window.showToast("Sessão terminada. Até breve.", "info"))
      );
    };

    renderArea(area, false);
    renderArea(mobileArea, true);
  }

  function showAuthError(err) {
    console.warn("Auth error:", err);
    window.showToast("Não foi possível iniciar sessão. Tenta novamente.", "error");
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
  }
  function escapeAttr(s) {
    return String(s ?? "").replace(/"/g, "&quot;");
  }

  /* ---------------- onAuthChange ---------------- */
  let authChangeHandler = null;
  function onAuthChange() {
    renderAuthUI();
    if (typeof authChangeHandler === "function") authChangeHandler();
  }
  function setOnAuthChange(fn) {
    authChangeHandler = fn;
  }

  /* ---------------- Init ---------------- */
  async function initAuth() {
    if (configured) {
      const c = initClient();
      const { data } = await c.auth.getSession();
      session = data.session;
      c.auth.onAuthStateChange((event, newSession) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          session = newSession;
          if (event === "SIGNED_IN") getProfile().then(() => onAuthChange());
        } else if (event === "SIGNED_OUT") {
          session = null;
          currentProfile = null;
        }
        onAuthChange();
      });
    } else {
      // demo: lê o perfil local
      session = demoProfile() ? { user: demoProfile() } : null;
    }
    onAuthChange();
  }

  window.Auth = {
    init: initAuth,
    isDemo,
    isLoggedIn,
    getUser,
    getProfile,
    updateProfile,
    signInWithGoogle,
    signOut,
    setOnAuthChange,
    getClient,
  };
})();
