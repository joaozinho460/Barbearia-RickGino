async loginWithGoogle() {
  if (!window.supabaseClient) {
    console.error("Supabase ainda não foi inicializado.");
    return;
  }

  const { data, error } =
    await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://barbearia-rick-gino.vercel.app/"
      }
    });

  if (error) {
    console.error("❌ Erro no login Google:", error.message);
    return;
  }

  console.log("🔵 Redirecionando para o Google...");
  return data;
},
