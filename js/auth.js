// ========================================
// AUTENTICAÇÃO - BARBEARIA RICKGINO
// Supabase + Google
// ========================================

window.Auth = {

  async init() {
    try {

      // Verifica se o Supabase foi carregado
      if (!window.supabase) {
        console.error("Supabase JS não foi carregado.");
        return;
      }

      // Verifica a configuração
      if (
        !window.SUPABASE_CONFIG ||
        !window.SUPABASE_CONFIG.SUPABASE_URL ||
        !window.SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY
      ) {
        console.error("Configuração do Supabase não encontrada.");
        return;
      }

      // Cria o cliente Supabase
      window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_CONFIG.SUPABASE_URL,
        window.SUPABASE_CONFIG.SUPABASE_PUBLISHABLE_KEY
      );

      console.log("✅ Supabase conectado.");

      // Verifica utilizador autenticado
      const {
        data: { user },
        error
      } = await window.supabaseClient.auth.getUser();

      if (error) {
        console.error("Erro ao verificar utilizador:", error.message);
      }

      // Mostra o botão correto
      this.renderAuth(user);

      // Escuta login/logout
      window.supabaseClient.auth.onAuthStateChange(
        (event, session) => {

          console.log("🔐 Estado de autenticação:", event);

          this.renderAuth(session?.user || null);

          if (session?.user) {
            console.log(
              "✅ Login efetuado:",
              session.user.email
            );
          }
        }
      );

    } catch (error) {
      console.error(
        "Erro ao inicializar autenticação:",
        error
      );
    }
  },


  // ========================================
  // MOSTRAR BOTÃO ENTRAR / ÁREA DO CLIENTE
  // ========================================

  renderAuth(user) {

    const authArea = document.getElementById("authArea");
    const mobileAuth = document.getElementById("mobileAuth");

    if (!authArea && !mobileAuth) return;


    // ========================================
    // UTILIZADOR NÃO AUTENTICADO
    // ========================================

    if (!user) {

      const loginHTML = `
        <button
          class="auth-login-btn"
          onclick="window.Auth.loginWithGoogle()"
          type="button"
        >
          <span class="auth-google-icon">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M21.35 12.27c0-.71-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26z"
              />
              <path
                fill="#34A853"
                d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.55 0-4.71-1.72-5.49-4.04H3.27v2.53A9.74 9.74 0 0 0 12 21.6z"
              />
              <path
                fill="#FBBC05"
                d="M6.51 13.68A5.86 5.86 0 0 1 6.2 12c0-.58.1-1.15.31-1.68V7.79H3.27A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.21l3.24-2.53z"
              />
              <path
                fill="#EA4335"
                d="M12 6.28c1.43 0 2.72.49 3.74 1.46l2.8-2.8C16.84 3.37 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.73 5.39l3.24 2.53C7.29 8 9.45 6.28 12 6.28z"
              />
            </svg>
          </span>

          <span>Entrar</span>
        </button>
      `;

      if (authArea) {
        authArea.innerHTML = loginHTML;
      }

      if (mobileAuth) {
        mobileAuth.innerHTML = loginHTML;
      }

      return;
    }


    // ========================================
    // UTILIZADOR AUTENTICADO
    // ========================================

    const name =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Cliente";

    const avatar =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      "";

    const userHTML = `
      <div class="auth-user">

        ${
          avatar
            ? `<img
                src="${avatar}"
                alt="${name}"
                class="auth-avatar"
              >`
            : `
              <div class="auth-avatar auth-avatar-fallback">
                ${name.charAt(0).toUpperCase()}
              </div>
            `
        }

        <span class="auth-user-name">
          ${name}
        </span>

        <button
          class="auth-logout-btn"
          onclick="window.Auth.logout()"
          type="button"
        >
          Sair
        </button>

      </div>
    `;

    if (authArea) {
      authArea.innerHTML = userHTML;
    }

    if (mobileAuth) {
      mobileAuth.innerHTML = userHTML;
    }
  },


  // ========================================
  // LOGIN COM GOOGLE
  // ========================================

  async loginWithGoogle() {

    if (!window.supabaseClient) {
      console.error(
        "Supabase ainda não foi inicializado."
      );
      return;
    }

    const { data, error } =
      await window.supabaseClient.auth.signInWithOAuth({
        provider: "google",

        options: {
          redirectTo: window.location.origin
        }
      });

    if (error) {
      console.error(
        "❌ Erro no login Google:",
        error.message
      );

      alert(
        "Não foi possível iniciar o login com Google."
      );

      return;
    }

    console.log(
      "🔵 Redirecionando para o Google..."
    );

    return data;
  },


  // ========================================
  // LOGOUT
  // ========================================

  async logout() {

    if (!window.supabaseClient) {
      return;
    }

    const { error } =
      await window.supabaseClient.auth.signOut();

    if (error) {
      console.error(
        "Erro ao terminar sessão:",
        error.message
      );
      return;
    }

    console.log("👋 Sessão terminada.");

    this.renderAuth(null);
  },


  // ========================================
  // OBTER UTILIZADOR ATUAL
  // ========================================

  async getUser() {

    if (!window.supabaseClient) {
      return null;
    }

    const {
      data: { user }
    } = await window.supabaseClient.auth.getUser();

    return user || null;
  }

};
