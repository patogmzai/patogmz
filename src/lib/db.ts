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
export async function getOpportunities(): Promise<Opportunity[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("opportunities")
    .select("*")
    .order("tier", { ascending: false })
    .order("ev", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Opportunity[];
}

export type NewOpportunity = Omit<Opportunity, "id" | "scanned_at">;

/** Reemplaza el escaneo anterior: borra todo e inserta lo nuevo. */
export async function replaceOpportunities(rows: NewOpportunity[]): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error: delErr } = await sb.from("opportunities").delete().not("id", "is", null);
  if (delErr) throw delErr;
  if (rows.length) {
    const { error: insErr } = await sb.from("opportunities").insert(rows);
    if (insErr) throw insErr;
  }
}

// ---------- bets ----------
export async function getBets(): Promise<Bet[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("bets").select("*").order("placed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Bet[];
}

export type NewBet = Pick<Bet, "league" | "pick" | "odds" | "stake" | "kind"> &
  Partial<Pick<Bet, "fair_prob" | "opportunity_id" | "placed_at">>;

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
