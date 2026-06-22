-- ============================================================
-- Scanner de Valor — esquema Supabase (Postgres)
-- v1 · usuario único · acceso SOLO desde el servidor (service role)
--
-- Cómo aplicarlo:
--   Supabase Dashboard → SQL Editor → pega este archivo → Run.
-- gen_random_uuid() viene incluido en Postgres 13+ (Supabase lo trae).
-- ============================================================

-- ------------------------------------------------------------
-- config — fila única (id = 1). Banca inicial + parámetros de riesgo.
-- ------------------------------------------------------------
create table if not exists public.config (
  id            smallint      primary key default 1 check (id = 1),
  start_bank    numeric(14,2) not null default 20000 check (start_bank >= 0),
  kelly_frac    numeric(4,3)  not null default 0.25  check (kelly_frac > 0 and kelly_frac <= 1),
  unit_pct      numeric(5,2)  not null default 3     check (unit_pct > 0 and unit_pct <= 100),
  stop_loss_pct numeric(5,2)  not null default -10   check (stop_loss_pct < 0),
  updated_at    timestamptz   not null default now()
);

-- semilla de la fila única (idempotente)
insert into public.config (id) values (1)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- opportunities — snapshot del escaneo. Se REEMPLAZA cada 30 min.
-- ev y tier se guardan ya calculados para poder rankear/filtrar en SQL.
-- ------------------------------------------------------------
create table if not exists public.opportunities (
  id          uuid          primary key default gen_random_uuid(),
  league      text          not null,
  sport       text          not null,
  market      text          not null,
  match       text          not null,
  pick        text          not null,
  odds        numeric(8,3)  not null check (odds > 1),      -- mejor momio ofrecido (libro de referencia de la API)
  sharp_odds  numeric(8,3)           check (sharp_odds > 1),-- línea sharp/consenso usada para de-vig (opcional, auditoría)
  fair_prob   numeric(6,5)  not null check (fair_prob > 0 and fair_prob < 1),
  ev          numeric(8,5)  not null,                       -- EV decimal: 0.04 = +4%
  tier        smallint      not null check (tier between 1 and 5),
  commence_time timestamptz,                                   -- hora del partido (de la API de momios)
  status      text          not null default 'vigente' check (status in ('vigente','expirada','liquidada')),
  first_seen_at timestamptz  not null default now(),            -- primera vez detectada (slate estable)
  dedup_key   text,                                             -- clave estable: league|market|match|pick
  scanned_at  timestamptz   not null default now()              -- última vez vista
);

create unique index if not exists opportunities_dedup_idx on public.opportunities (dedup_key);
create index if not exists opportunities_rank_idx    on public.opportunities (tier desc, ev desc);
create index if not exists opportunities_status_idx  on public.opportunities (status);
create index if not exists opportunities_sport_idx    on public.opportunities (sport);

-- ------------------------------------------------------------
-- bets — bitácora. P&L y banca se CALCULAN desde aquí (no se almacenan).
--   result: pending | win | loss | push
--   kind:   single  | parlay | manual
-- odds = momio realmente tomado (el de Playdoit si lo confirmaste).
-- ------------------------------------------------------------
create table if not exists public.bets (
  id             uuid          primary key default gen_random_uuid(),
  placed_at      timestamptz   not null default now(),
  league         text,
  pick           text          not null,
  odds           numeric(8,3)  not null check (odds > 1),
  stake          numeric(14,2) not null check (stake >= 0),
  result         text          not null default 'pending' check (result in ('pending','win','loss','push')),
  kind           text          not null default 'single'  check (kind in ('single','parlay','manual')),
  fair_prob      numeric(6,5)           check (fair_prob > 0 and fair_prob < 1), -- prob. justa del modelo al apostar (null en manual)
  tier           smallint               check (tier between 1 and 5),  -- confianza al apostar (para "el estudio")
  market         text,                                       -- mercado (ML/total/etc.) — desgloses
  sport          text,                                       -- deporte — desgloses
  opportunity_id uuid,                                       -- procedencia (sin FK: opportunities se borra cada escaneo)
  created_at     timestamptz   not null default now()
);

create index if not exists bets_placed_idx on public.bets (placed_at desc);
create index if not exists bets_result_idx on public.bets (result);

-- ------------------------------------------------------------
-- expert_picks — picks PUBLICADOS por apostadores famosos.
-- Solo datos verídicos con procedencia: NADA de rumores ni de picks
-- inventados por un LLM. Cada fila EXIGE fuente + URL + fecha de publicación.
-- Sección informativa: NO alimenta el motor de recomendaciones (que es determinístico).
-- ------------------------------------------------------------
create table if not exists public.expert_picks (
  id           uuid          primary key default gen_random_uuid(),
  expert_name  text          not null,                       -- p.ej. "Billy Walters"
  source       text          not null,                       -- "Action Network", "X/@handle", "VSiN"...
  source_url   text          not null,                       -- enlace al pick publicado (auditable)
  published_at timestamptz   not null,                        -- cuándo lo publicó el apostador
  league       text,
  sport        text,
  match        text,
  pick         text          not null,
  odds         numeric(8,3)           check (odds is null or odds > 1), -- momio que reportó (si lo dio)
  stake_units  numeric(5,2),                                  -- unidades que dijo arriesgar (si lo dio)
  rationale    text,                                          -- contexto (un LLM puede RESUMIR la fuente; jamás inventar el pick)
  verified     boolean       not null default false,          -- ¿confirmaste la fuente a mano?
  result       text          not null default 'pending' check (result in ('pending','win','loss','push','void')),
  captured_at  timestamptz   not null default now()
);

create index if not exists expert_picks_published_idx on public.expert_picks (published_at desc);
create index if not exists expert_picks_expert_idx    on public.expert_picks (expert_name);

-- ------------------------------------------------------------
-- Vistas de conveniencia para el dashboard
-- ------------------------------------------------------------

-- P&L por apuesta (win → ganancia neta, loss → -stake, push/pending → 0)
create or replace view public.v_bets_pl as
select
  b.*,
  case
    when b.result = 'win'  then b.stake * (b.odds - 1)
    when b.result = 'loss' then -b.stake
    else 0
  end as pl
from public.bets b;

-- Banca actual = banca inicial + Σ(P&L de apuestas liquidadas)
create or replace view public.v_bankroll as
select
  c.start_bank,
  coalesce((
    select sum(case when b.result = 'win' then b.stake * (b.odds - 1)
                    when b.result = 'loss' then -b.stake
                    else 0 end)
    from public.bets b
    where b.result in ('win','loss')
  ), 0) as settled_pl,
  c.start_bank + coalesce((
    select sum(case when b.result = 'win' then b.stake * (b.odds - 1)
                    when b.result = 'loss' then -b.stake
                    else 0 end)
    from public.bets b
    where b.result in ('win','loss')
  ), 0) as current_bank
from public.config c
where c.id = 1;

-- ------------------------------------------------------------
-- Trigger: mantener config.updated_at
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists config_touch on public.config;
create trigger config_touch before update on public.config
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Seguridad (RLS) — patrón de usuario único, solo-servidor
--   RLS ON sin policies = el rol público/anon queda DENEGADO por completo.
--   Las API routes de Next.js usan SUPABASE_SERVICE_ROLE_KEY, que bypassa RLS.
--   El cliente nunca habla directo con la DB.
-- ------------------------------------------------------------
alter table public.config        enable row level security;
alter table public.opportunities enable row level security;
alter table public.bets          enable row level security;
alter table public.expert_picks  enable row level security;
