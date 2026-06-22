// Cliente de The Odds API (solo servidor). Región EU para incluir a Pinnacle.
const BASE = process.env.ODDS_API_BASE_URL || "https://api.the-odds-api.com/v4";
const KEY = process.env.ODDS_API_KEY;
const REGION = "eu"; // Pinnacle vive en la región EU

export interface Outcome {
  name: string;
  price: number; // momio decimal
  point?: number;
}
export interface OddsMarket {
  key: string;
  outcomes: Outcome[];
}
export interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}
export interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: OddsBookmaker[];
}

export interface FetchResult {
  events: OddsEvent[];
  remaining: string | null; // créditos restantes (header x-requests-remaining)
}

/**
 * Conjunto de sport keys en temporada. El endpoint /sports NO consume créditos,
 * así evitamos gastar cuota pidiendo odds de ligas fuera de temporada.
 */
export async function fetchActiveSports(): Promise<Set<string>> {
  if (!KEY) throw new Error("Falta ODDS_API_KEY en el entorno.");
  const r = await fetch(`${BASE}/sports?apiKey=${KEY}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Odds API /sports: ${r.status}`);
  const sports = (await r.json()) as Array<{ key: string; active: boolean }>;
  return new Set(sports.filter((s) => s.active).map((s) => s.key));
}

export async function fetchLeagueOdds(sportKey: string, markets: string[]): Promise<FetchResult> {
  if (!KEY) throw new Error("Falta ODDS_API_KEY en el entorno.");
  const qs = new URLSearchParams({
    apiKey: KEY,
    regions: REGION,
    markets: markets.join(","),
    oddsFormat: "decimal",
  });
  const r = await fetch(`${BASE}/sports/${sportKey}/odds?${qs}`, { cache: "no-store" });
  const remaining = r.headers.get("x-requests-remaining");
  // 422 = sport fuera de temporada o sin eventos → no es error, solo está vacío.
  if (r.status === 422) return { events: [], remaining };
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Odds API ${sportKey}: ${r.status} ${body}`);
  }
  return { events: (await r.json()) as OddsEvent[], remaining };
}
