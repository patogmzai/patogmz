// Motor del escaneo: por cada evento/mercado, ancla en Pinnacle (sharp),
// des-viga su línea para la prob. justa, y compara contra el mejor momio
// ofrecido entre los libros. Determinístico — sin LLM, sin azar.
import { devig, evPct, confTier } from "./betting";
import { LEAGUES, type LeagueConfig } from "./leagues";
import { fetchLeagueOdds, fetchActiveSports, type OddsEvent, type Outcome } from "./odds";
import { syncOpportunities, type NewOpportunity } from "./db";

const SHARP_KEY = "pinnacle";

function marketLabel(key: string): string {
  switch (key) {
    case "h2h": return "Ganador";
    case "totals": return "Total";
    case "btts": return "Ambos anotan";
    case "spreads": return "Hándicap";
    default: return key;
  }
}

function pickLabel(marketKey: string, o: Outcome): string {
  if (marketKey === "totals") return (o.name === "Over" ? "Más de " : "Menos de ") + o.point;
  if (marketKey === "btts") return o.name === "Yes" ? "BTTS Sí" : "BTTS No";
  if (o.name === "Draw") return "Empate";
  return o.name; // h2h: nombre del equipo
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * Oportunidades de un (evento, mercado). Exportado para tests.
 * Agrupa las salidas del sharp por punto (h2h/btts → sin punto, totals → punto)
 * para poder de-vigar cada mercado completo.
 */
export function marketOpportunities(
  ev: OddsEvent,
  league: LeagueConfig,
  marketKey: string,
): NewOpportunity[] {
  const sharp = ev.bookmakers.find((b) => b.key === SHARP_KEY);
  if (!sharp) return []; // v1: requiere ancla Pinnacle
  const sharpMarket = sharp.markets.find((m) => m.key === marketKey);
  if (!sharpMarket) return [];

  const groups = new Map<string, Outcome[]>();
  for (const o of sharpMarket.outcomes) {
    const k = o.point == null ? "" : String(o.point);
    const g = groups.get(k);
    if (g) g.push(o);
    else groups.set(k, [o]);
  }

  const out: NewOpportunity[] = [];
  for (const outcomes of groups.values()) {
    if (outcomes.length < 2) continue; // mercado incompleto, no se puede de-vigar
    const fair = devig(outcomes.map((o) => o.price));
    outcomes.forEach((o, i) => {
      const p = fair[i];
      // mejor momio ofrecido entre TODOS los libros para la misma (name, point)
      let best = o.price;
      for (const b of ev.bookmakers) {
        const m = b.markets.find((mm) => mm.key === marketKey);
        const match = m?.outcomes.find(
          (x) => x.name === o.name && (x.point ?? null) === (o.point ?? null)
        );
        if (match && match.price > best) best = match.price;
      }
      const value = evPct(p, best);
      if (value <= 0) return; // sin valor, no se guarda
      out.push({
        league: league.label,
        sport: league.sport,
        market: marketLabel(marketKey),
        match: `${ev.home_team} vs. ${ev.away_team}`,
        pick: pickLabel(marketKey, o),
        odds: round3(best),
        sharp_odds: round3(o.price),
        fair_prob: round5(p),
        ev: round5(value),
        tier: confTier(value, p),
        commence_time: ev.commence_time,
      });
    });
  }
  return out;
}

export interface ScanResult {
  scanned_at: string;
  total: number;
  credits_remaining: number | null; // header x-requests-remaining más bajo visto
  skipped_off_season: string[];
  leagues: Array<{
    league: string;
    events?: number;
    opps?: number;
    remaining?: string | null;
    error?: string;
  }>;
}

export async function runScan(): Promise<ScanResult> {
  // Pre-chequeo GRATIS: solo escaneamos ligas en temporada (no gasta créditos).
  let active: Set<string> | null = null;
  try { active = await fetchActiveSports(); } catch { active = null; }
  const leagues = active ? LEAGUES.filter((l) => active!.has(l.key)) : LEAGUES;
  const skipped = active ? LEAGUES.filter((l) => !active!.has(l.key)).map((l) => l.label) : [];

  // Ligas en paralelo para no exceder el timeout de la función.
  const results = await Promise.all(
    leagues.map(async (league) => {
      try {
        const { events, remaining } = await fetchLeagueOdds(league.key, league.markets);
        const opps: NewOpportunity[] = [];
        for (const ev of events) {
          for (const m of league.markets) opps.push(...marketOpportunities(ev, league, m));
        }
        return { opps, meta: { league: league.label, events: events.length, opps: opps.length, remaining } };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        return { opps: [] as NewOpportunity[], meta: { league: league.label, error: msg } };
      }
    })
  );

  const all = results.flatMap((r) => r.opps);
  await syncOpportunities(all);

  const remainings = results
    .map((r) => r.meta.remaining)
    .filter((x): x is string => x != null)
    .map(Number)
    .filter((n) => !Number.isNaN(n));

  return {
    scanned_at: new Date().toISOString(),
    total: all.length,
    credits_remaining: remainings.length ? Math.min(...remainings) : null,
    skipped_off_season: skipped,
    leagues: results.map((r) => r.meta),
  };
}
