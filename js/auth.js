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

      // Verifica se existe utilizador autenticado
      const {
        data: { user },
        error
      } = await window.supabaseClient.auth.getUser();

      if (error) {
        console.error("Erro ao verificar utilizador:", error.message);
        return;
      }

      if (user) {
        console.log("👤 Utilizador autenticado:", user.email);
      } else {
        console.log("ℹ️ Nenhum utilizador autenticado.");
      }

      // Escuta login/logout
      window.supabaseClient.auth.onAuthStateChange(
        (event, session) => {
          console.log("🔐 Estado de autenticação:", event);

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
