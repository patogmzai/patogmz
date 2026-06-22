// Tipos de fila que reflejan el esquema de Supabase (supabase/schema.sql).

export type BetResult = "pending" | "win" | "loss" | "push";
export type BetKind = "single" | "parlay" | "manual";

export interface Config {
  id: number;
  start_bank: number;
  kelly_frac: number;
  unit_pct: number;
  stop_loss_pct: number;
  updated_at: string;
}

export type ConfigPatchInput = Partial<
  Pick<Config, "start_bank" | "kelly_frac" | "unit_pct" | "stop_loss_pct">
>;

export type OpportunityStatus = "vigente" | "expirada" | "liquidada";

export interface Opportunity {
  id: string;
  league: string;
  sport: string;
  market: string;
  match: string;
  pick: string;
  odds: number;
  sharp_odds: number | null;
  fair_prob: number;
  ev: number;
  tier: number;
  commence_time: string | null;
  status: OpportunityStatus;   // vigente | expirada (valor se fue) | liquidada (juego pasó)
  first_seen_at: string;       // cuándo apareció por primera vez (slate estable)
  dedup_key: string | null;    // clave estable: league|market|match|pick
  scanned_at: string;          // última vez vista
}

/**
 * Oportunidad con cálculos de cliente.
 * ev/tier = consenso (mejor línea API), usados para rankear.
 * effOdds = precio efectivo (Playdoit si lo confirmaste, si no la línea API);
 * effEv y stake se recalculan contra ese precio. fair_prob nunca cambia.
 * isNew = apareció en el escaneo más reciente.
 */
export interface ComputedOpportunity extends Opportunity {
  playdoit: number | null;
  effOdds: number;
  effEv: number;
  stake: number;
  cap: number;
  isNew: boolean;
}

export interface Bet {
  id: string;
  placed_at: string;
  league: string | null;
  pick: string;
  odds: number;
  stake: number;
  result: BetResult;
  kind: BetKind;
  fair_prob: number | null;
  opportunity_id: string | null;
  created_at: string;
}

export type ExpertPickResult = "pending" | "win" | "loss" | "push" | "void";

export interface ExpertPick {
  id: string;
  expert_name: string;
  source: string;
  source_url: string;
  published_at: string;
  league: string | null;
  sport: string | null;
  match: string | null;
  pick: string;
  odds: number | null;
  stake_units: number | null;
  rationale: string | null;
  verified: boolean;
  result: ExpertPickResult;
  captured_at: string;
}
