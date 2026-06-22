// Capa de acceso a datos (solo servidor). Usa el cliente service-role.
import { getSupabaseAdmin } from "./supabase";
import type {
  Config, Opportunity, Bet, ExpertPick, BetResult, ExpertPickResult,
} from "./types";

// ---------- config ----------
export async function getConfig(): Promise<Config> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("config").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Config;
}

export type ConfigPatch = Partial<
  Pick<Config, "start_bank" | "kelly_frac" | "unit_pct" | "stop_loss_pct">
>;
export async function updateConfig(patch: ConfigPatch): Promise<Config> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("config").update(patch).eq("id", 1).select("*").single();
  if (error) throw error;
  return data as Config;
}

// ---------- opportunities ----------
/** Slate visible: vigentes + expiradas (no liquidadas/pasadas). */
export async function getOpportunities(): Promise<Opportunity[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("opportunities")
    .select("*")
    .neq("status", "liquidada")
    .order("tier", { ascending: false })
    .order("ev", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Opportunity[];
}

export type NewOpportunity = Pick<
  Opportunity,
  "league" | "sport" | "market" | "match" | "pick" | "odds" | "sharp_odds" | "fair_prob" | "ev" | "tier" | "commence_time"
>;

const dedupKey = (r: NewOpportunity) => `${r.league}|${r.market}|${r.match}|${r.pick}`;

/**
 * Sincroniza el escaneo SIN borrar el slate:
 *  - upsert por dedup_key (preserva first_seen_at de los existentes)
 *  - marca 'expirada' los vigentes que ya no aparecen (el valor se fue)
 *  - marca 'liquidada' los que su partido ya empezó
 *  - limpia expiradas/liquidadas viejas (>2 días) para acotar crecimiento
 */
export async function syncOpportunities(rows: NewOpportunity[]): Promise<void> {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({ ...r, dedup_key: dedupKey(r), scanned_at: now, status: "vigente" as const }));
  const currentKeys = new Set(payload.map((p) => p.dedup_key));

  const { data: existing, error: exErr } = await sb.from("opportunities").select("id, dedup_key, status");
  if (exErr) throw new Error(`read opportunities: ${exErr.message}`);

  // upsert: first_seen_at se omite a propósito → default now() en insert, intacto en update.
  if (payload.length) {
    const { error } = await sb.from("opportunities").upsert(payload, { onConflict: "dedup_key" });
    if (error) throw new Error(`upsert opportunities: ${error.message}`);
  }

  // expira los vigentes que ya no están en el escaneo
  const staleIds = (existing ?? [])
    .filter((o) => o.status === "vigente" && o.dedup_key && !currentKeys.has(o.dedup_key))
    .map((o) => o.id);
  if (staleIds.length) {
    const { error } = await sb.from("opportunities").update({ status: "expirada" }).in("id", staleIds);
    if (error) throw new Error(`expire opportunities: ${error.message}`);
  }

  // liquida los juegos ya empezados
  await sb.from("opportunities").update({ status: "liquidada" }).lt("commence_time", now).neq("status", "liquidada");

  // limpieza de viejas
  const cutoff = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  await sb.from("opportunities").delete().in("status", ["expirada", "liquidada"]).lt("scanned_at", cutoff);
}

// ---------- bets ----------
export async function getBets(): Promise<Bet[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("bets").select("*").order("placed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Bet[];
}

export type NewBet = Pick<Bet, "league" | "pick" | "odds" | "stake" | "kind"> &
  Partial<Pick<Bet, "fair_prob" | "tier" | "market" | "sport" | "opportunity_id" | "placed_at">>;

export async function addBet(b: NewBet): Promise<Bet> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("bets")
    .insert({ ...b, result: "pending" })
    .select("*")
    .single();
  if (error) throw error;
  return data as Bet;
}

export async function settleBet(id: string, result: BetResult): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("bets").update({ result }).eq("id", id);
  if (error) throw error;
}

export async function deleteBet(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("bets").delete().eq("id", id);
  if (error) throw error;
}

// ---------- expert_picks ----------
export async function getExpertPicks(): Promise<ExpertPick[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("expert_picks")
    .select("*")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExpertPick[];
}

export type NewExpertPick = Omit<ExpertPick, "id" | "captured_at">;

export async function addExpertPick(p: NewExpertPick): Promise<ExpertPick> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("expert_picks").insert(p).select("*").single();
  if (error) throw error;
  return data as ExpertPick;
}

export async function settleExpertPick(id: string, result: ExpertPickResult): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expert_picks").update({ result }).eq("id", id);
  if (error) throw error;
}

export async function deleteExpertPick(id: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("expert_picks").delete().eq("id", id);
  if (error) throw error;
}
