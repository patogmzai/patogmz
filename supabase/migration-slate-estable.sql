-- Migración: slate estable (Plan A).
-- Corre esto UNA vez en Supabase → SQL Editor.

-- Limpia el escaneo viejo (datos efímeros; se repuebla en el próximo escaneo).
delete from public.opportunities;

-- Nuevas columnas para el slate estable.
alter table public.opportunities
  add column if not exists status text not null default 'vigente'
    check (status in ('vigente','expirada','liquidada'));
alter table public.opportunities
  add column if not exists first_seen_at timestamptz not null default now();
alter table public.opportunities
  add column if not exists dedup_key text;

-- Índice único para upsert por clave estable.
create unique index if not exists opportunities_dedup_idx on public.opportunities (dedup_key);
create index if not exists opportunities_status_idx on public.opportunities (status);

-- Permisos (por si el rol service_role aún no los tiene en columnas nuevas).
grant all on public.opportunities to service_role;
