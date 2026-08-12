window.Auth = {

  async init() {
    if (!window.supabase) {
      console.error("Supabase não carregado.");
      return;
    }

    if (
      !window.SUPABASE_CONFIG ||
      !window.SUPABASE_CONFIG.SUPABASE_URL ||
      !window.SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY
    ) {
      console.error("Configuração do Supabase não encontrada.");
      return;
    }

    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.SUPABASE_URL,
      window.SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY
    );

    const {
      data: { user }
    } = await window.supabaseClient.auth.getUser();

    this.render(user);

    window.supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        this.render(session?.user || null);
      }
    );
  },

  render(user) {

    const authArea = document.getElementById("authArea");
    const mobileAuth = document.getElementById("mobileAuth");

    const html = user
      ? `
        <div class="auth-user">
          <span class="auth-user-name">
            ${user.user_metadata?.full_name || user.email?.split("@")[0] || "Cliente"}
          </span>
          <button
            class="auth-logout"
            onclick="window.Auth.logout()"
          >
            Sair
          </button>
        </div>
      `
      : `
        <button
          class="auth-login"
          onclick="window.Auth.loginWithGoogle()"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35 12.27h-9.18v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26z"/>
            <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.55 0-4.71-1.72-5.49-4.04H3.27v2.53A9.74 9.74 0 0 0 12 21.6z"/>
            <path fill="#FBBC05" d="M6.51 13.68A5.86 5.86 0 0 1 6.2 12c0-.58.1-1.15.31-1.68V7.79H3.27A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.21l3.24-2.53z"/>
            <path fill="#EA4335" d="M12 6.28c1.43 0 2.72.49 3.74 1.46l2.8-2.8C16.84 3.37 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.73 5.39l3.24 2.53C7.29 8 9.45 6.28 12 6.28z"/>
          </svg>
          <span>Entrar</span>
        </button>
      `;

    if (authArea) authArea.innerHTML = html;
    if (mobileAuth) mobileAuth.innerHTML = html;
  },

  async loginWithGoogle() {

    if (!window.supabaseClient) {
      console.error("Supabase não inicializado.");
      return;
    }

    const { error } =
      await window.supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });

    if (error) {
      console.error("Erro no login:", error.message);
    }
  },

  async logout() {

    if (!window.supabaseClient) return;

    await window.supabaseClient.auth.signOut();
  },

  async getUser() {

    if (!window.supabaseClient) return null;

    const {
      data: { user }
    } = await window.supabaseClient.auth.getUser();

    return user || null;
  }
};
