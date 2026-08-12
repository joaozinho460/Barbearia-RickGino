/*
 * ============================================================
 *  Barbearia RickGino — Configuração do Supabase
 * ============================================================
 *  INSTRUÇÕES:
 *  1. Cria um projeto em https://supabase.com
 *  2. Abre  Project Settings → API
 *  3. Copia o "Project URL" para SUPABASE_URL
 *  4. Copia a "anon public" key para SUPABASE_PUBLISHABLE_KEY
 *  5. Ativa Google OAuth em  Authentication → Providers → Google
 *
 *  NUNCA colocar a "service_role" key aqui (nem no frontend).
 *  Esta key só pode ser usada no servidor.
 *
 *  Enquanto os valores não forem configurados, o site corre em
 *  "modo demonstração": login e marcações funcionam localmente
 *  (localStorage) para poderes ver todos os estados da interface.
 *  Depois de configurares o Supabase, passa a funcionar de verdade.
 * ============================================================
 */

window.SUPABASE_CONFIG = {
  // CONFIGURAR AQUI — URL do teu projeto Supabase
  SUPABASE_URL: "YOUR_SUPABASE_URL",

  // CONFIGURAR AQUI — anon public key do teu projeto Supabase
  SUPABASE_PUBLISHABLE_KEY: "YOUR_SUPABASE_ANON_KEY",
};

/*
 * Modo demonstração
 * O sistema deteta automaticamente se o Supabase está configurado.
 * Podes forçar o modo demo com true (útil para testes):
 */
window.FORCE_DEMO_MODE = false;
