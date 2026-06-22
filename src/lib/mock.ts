// Datos de demostración con la MISMA forma que las filas de la DB.
// En el paso 4 esto se reemplaza por lecturas reales de Supabase.
import { evPct, confTier } from "./betting";
import type { Config, Opportunity, Bet, ExpertPick } from "./types";

const nowISO = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 3600 * 1000).toISOString();

export const mockConfig: Config = {
  id: 1,
  start_bank: 20000,
  kelly_frac: 0.25,
  unit_pct: 3,
  stop_loss_pct: -10,
  updated_at: nowISO(),
};

// fairProb = consenso vig-free simulado (en producción llega por API).
const rawOpps: Array<
  Pick<Opportunity, "league" | "sport" | "market" | "match" | "pick" | "odds" | "fair_prob">
> = [
  { league: "NBA", sport: "nba", market: "Spread", match: "Celtics vs. Suns", pick: "Celtics -4.5", odds: 1.6, fair_prob: 0.65 },
  { league: "CHAMPIONS", sport: "futbol", market: "Hándicap asiático", match: "Real Madrid vs. Arsenal", pick: "Real Madrid -0.5", odds: 1.9, fair_prob: 0.55 },
  { league: "MLB", sport: "otros", market: "Run line", match: "Dodgers vs. Padres", pick: "Dodgers -1.5", odds: 2.2, fair_prob: 0.475 },
  { league: "TENIS", sport: "otros", market: "Ganador", match: "Alcaraz vs. Sinner", pick: "Alcaraz", odds: 1.85, fair_prob: 0.567 },
  { league: "NFL", sport: "nfl", market: "Total puntos", match: "Chiefs vs. Bills", pick: "Más de 47.5", odds: 1.95, fair_prob: 0.527 },
  { league: "LA LIGA", sport: "futbol", market: "Ambos anotan", match: "Barcelona vs. Sevilla", pick: "BTTS Sí", odds: 1.8, fair_prob: 0.572 },
  { league: "UFC", sport: "otros", market: "Método", match: "Pereira vs. Ankalaev", pick: "Termina por decisión", odds: 2.3, fair_prob: 0.448 },
  { league: "LIGA MX", sport: "futbol", market: "Ganador", match: "Rayados vs. Tigres", pick: "Rayados", odds: 2.46, fair_prob: 0.414 },
  { league: "MUNDIAL 2026", sport: "futbol", market: "Ganador", match: "México vs. Croacia", pick: "México", odds: 3.55, fair_prob: 0.295 },
  { league: "NBA", sport: "nba", market: "Total puntos", match: "Nuggets vs. Suns", pick: "Más de 224.5", odds: 1.9, fair_prob: 0.52 },
];

export const mockOpportunities: Opportunity[] = rawOpps.map((r, i) => {
  const ev = evPct(r.fair_prob, r.odds);
  return {
    id: `op-${i + 1}`,
    sharp_odds: null,
    ev,
    tier: confTier(ev, r.fair_prob),
    scanned_at: nowISO(),
    ...r,
  };
});

type SeedBet = Pick<Bet, "league" | "pick" | "odds" | "stake" | "result" | "kind"> & {
  d: number;
};
const seedBets: SeedBet[] = [
  { d: 2, league: "CHAMPIONS", pick: "PSG -0.5", odds: 2.05, stake: 300, result: "win", kind: "single" },
  { d: 2, league: "NBA", pick: "Celtics -4.5", odds: 1.91, stake: 300, result: "loss", kind: "single" },
  { d: 3, league: "LIGA MX", pick: "Cruz Azul ML", odds: 2.3, stake: 260, result: "win", kind: "single" },
  { d: 3, league: "MLB", pick: "Yankees ML", odds: 1.74, stake: 350, result: "loss", kind: "single" },
  { d: 3, league: "NFL", pick: "Over 44.5", odds: 1.95, stake: 280, result: "win", kind: "single" },
  { d: 4, league: "TENIS", pick: "Swiatek ML", odds: 1.55, stake: 300, result: "loss", kind: "single" },
  { d: 4, league: null, pick: "PSG -0.5 + Over 44.5", odds: 4.0, stake: 150, result: "loss", kind: "parlay" },
  { d: 5, league: "UFC", pick: "Por KO/TKO", odds: 2.4, stake: 220, result: "win", kind: "single" },
  { d: 5, league: "NBA", pick: "Lakers +6.5", odds: 1.91, stake: 280, result: "loss", kind: "single" },
  { d: 6, league: "LIGA MX", pick: "Tigres ML", odds: 2.1, stake: 320, result: "win", kind: "single" },
];

export const mockBets: Bet[] = seedBets.map((b, i) => ({
  id: `seed-${i + 1}`,
  placed_at: daysAgo(b.d),
  league: b.league,
  pick: b.pick,
  odds: b.odds,
  stake: b.stake,
  result: b.result,
  kind: b.kind,
  fair_prob: null,
  opportunity_id: null,
  created_at: daysAgo(b.d),
}));

// Picks de apostadores famosos: DEMO de formato, NO picks reales.
// Marcados verified=false a propósito — reemplázalos por picks reales con su fuente.
export const mockExpertPicks: ExpertPick[] = [
  {
    id: "ep-demo-1",
    expert_name: "Ejemplo — reemplázame",
    source: "demo",
    source_url: "#",
    published_at: daysAgo(1),
    league: "NFL",
    sport: "nfl",
    match: "Chiefs vs. Bills",
    pick: "Bills +2.5",
    odds: 1.95,
    stake_units: 2,
    rationale:
      "Demo de formato. Aquí va el contexto resumido de la fuente. Registra picks reales con su enlace verificable.",
    verified: false,
    result: "pending",
    captured_at: daysAgo(1),
  },
  {
    id: "ep-demo-2",
    expert_name: "Ejemplo — reemplázame",
    source: "demo",
    source_url: "#",
    published_at: daysAgo(4),
    league: "NBA",
    sport: "nba",
    match: "Celtics vs. Heat",
    pick: "Celtics ML",
    odds: 1.7,
    stake_units: 3,
    rationale: "Demo ya liquidado, para mostrar cómo se ve el récord del apostador.",
    verified: false,
    result: "win",
    captured_at: daysAgo(4),
  },
];
