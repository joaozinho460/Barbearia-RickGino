-- ============================================================
--  Barbearia RickGino — Esquema Supabase (tabelas + RLS + RPC)
-- ============================================================
--  Como usar:
--   1. Cria um projeto em https://supabase.com
--   2. SQL Editor → cola e executa este ficheiro (ou parte dele)
--   3. Ativa Google OAuth em Authentication → Providers → Google
--   4. Cola a URL e a anon key em js/config.js
--
--  NUNCA uses a service_role key no frontend.
--  A verificação de horários ocupados usa a função RPC
--  "get_taken_slots" (SECURITY DEFINER) porque a RLS impede
--  que o cliente veja marcações de outros utilizadores.
-- ============================================================

-- ------------------------------------------------------------
--  TABELA: profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  email text,
  telefone text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
--  TABELA: bookings
-- ------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  service_name text not null,
  barber_name text not null,
  booking_date date not null,
  booking_time text not null,
  status text not null default 'confirmed',
  reference text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_date_idx on public.bookings (booking_date);

-- ------------------------------------------------------------
--  TRIGGER: atualiza updated_at automaticamente
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
--  ROW LEVEL SECURITY
--  Cada utilizador só acede ao próprio perfil e às próprias
--  marcações. Não existe acesso cruzado.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

-- profiles: ver o próprio
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  using (id = auth.uid());

-- profiles: criar o próprio (auto-criação no primeiro login)
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
  on public.profiles for insert
  with check (id = auth.uid());

-- profiles: editar o próprio
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- bookings: ver as próprias
drop policy if exists "bookings select own" on public.bookings;
create policy "bookings select own"
  on public.bookings for select
  using (user_id = auth.uid());

-- bookings: criar as próprias
drop policy if exists "bookings insert own" on public.bookings;
create policy "bookings insert own"
  on public.bookings for insert
  with check (user_id = auth.uid());

-- bookings: atualizar as próprias (usado no cancelamento)
drop policy if exists "bookings update own" on public.bookings;
create policy "bookings update own"
  on public.bookings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- NOTA: o cancelamento nunca apaga registos. O frontend apenas
-- muda o status para 'cancelled'.

-- ------------------------------------------------------------
--  FUNÇÃO RPC: get_taken_slots
--  Devolve os horários ocupados de um dia (sem expor quem os
--  marcou). SECURITY DEFINER permite consultar marcações de
--  outros utilizadores sem quebrar a RLS.
-- ------------------------------------------------------------
create or replace function public.get_taken_slots(p_date date)
returns table (booking_time text, barber_name text)
language sql
security definer
set search_path = public
as $$
  select b.booking_time, b.barber_name
  from public.bookings b
  where b.booking_date = p_date
    and b.status <> 'cancelled'
  order by b.booking_time;
$$;

-- Permitir que todos os utilizadores autenticados chamem a função
revoke all on function public.get_taken_slots(date) from public;
grant execute on function public.get_taken_slots(date) to authenticated;
