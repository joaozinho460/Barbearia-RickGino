# Barbearia RickGino — Website Premium

Website completo para a **Barbearia RickGino**, em Setúbal, Portugal.
Design premium (preto / branco / cinza + detalhes dourados), 100% responsivo,
com sistema de conta avançado, login Google e marcações online.

## Estrutura

```
index.html            Página pública (hero, serviços, equipa, galeria, etc.)
profile.html          Painel de cliente (perfil, marcações, histórico, definições)
css/
  style.css           Design principal do site público
  booking.css         Wizard de marcação
  profile.css         Painel de perfil
js/
  config.js           SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY  ← CONFIGURAR
  data.js             TODO o conteúdo editável (serviços, equipa, preços, horários)
  main.js             Renderização das secções, animações, toasts
  auth.js             Supabase Auth + Google OAuth
  bookings.js         Fluxo de marcação (7 passos) + camada de dados
  profile.js          Painel de perfil completo
supabase/
  schema.sql          Tabelas, RLS e funções RPC para o Supabase
favicon.svg           Favicon
robots.txt            SEO
sitemap.xml           SEO
```

## Como configurar o Supabase (passo a passo)

1. Cria um projeto grátis em <https://supabase.com>.
2. Vai a **SQL Editor** e cola o conteúdo de `supabase/schema.sql` → **Run**.
   Isto cria as tabelas `profiles` e `bookings`, ativa RLS e cria a função
   `get_taken_slots` (necessária para marcar horários ocupados como indisponíveis).
3. Vai a **Authentication → Providers → Google** e ativa o provider:
   - Cola o *Client ID* e o *Client Secret* de uma **OAuth Client** criada no
     Google Cloud Console.
   - Adiciona como URL de redirecionamento (Redirect URL):
     `https://<o-teu-projeto>.supabase.co/auth/v1/callback`
4. Vai a **Project Settings → API** e copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_PUBLISHABLE_KEY`
5. Abre `js/config.js` e cola os dois valores. Nunca uses a `service_role` key.

> **Modo demonstração**: enquanto o Supabase não estiver configurado, o site corre
> em modo demo (localStorage) para poderes ver todos os estados. É detetado
> automaticamente.

## Conteúdo editável

Quase tudo está em `js/data.js`:

- **Serviços e preços** → `services`
- **Equipa** → `team` (fotos, especialidades, descrições)
- **Horários de marcação** → `bookingSlots`
- **Horário de funcionamento** → `schedule`
- **Galeria** → `gallery`
- **Avaliações / depoimentos** → `testimonials`
- **Contactos** → `business` (telefone, morada, Instagram, link do site)

## Comportamento das marcações

- O cancelamento **não apaga** registos: apenas muda `status = 'cancelled'`.
- Antes de confirmar, o sistema consulta o Supabase (função `get_taken_slots`)
  e torna indisponíveis os horários ocupados.
- A RLS garante que cada utilizador só vê/edita o **próprio** perfil e as
  **próprias** marcações.
- Após o login com Google, o perfil é criado automaticamente na 1.ª visita.

## SEO

- `index.html` inclui title, meta description, canonical, Open Graph e
  Schema.org (`BarberShop`).
- `robots.txt` e `sitemap.xml` já existem — substituir o domínio
  `www.barbeariarickgino.pt` pelo domínio real quando estiver online.

## Desenvolvimento local

```bash
python3 -m http.server 8080
```

Abre `http://localhost:8080`.
