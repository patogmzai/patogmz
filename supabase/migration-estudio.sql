-- Migración: "el estudio" (Plan B).
-- Corre esto UNA vez en Supabase → SQL Editor.
-- Agrega los campos que la analítica necesita para desglosar por
-- confianza / mercado / deporte. Las apuestas viejas quedan en null
-- ("sin clasificar"); las nuevas se capturan automáticamente.

alter table public.bets add column if not exists tier smallint;
alter table public.bets add column if not exists market text;
alter table public.bets add column if not exists sport text;

grant all on public.bets to service_role;
