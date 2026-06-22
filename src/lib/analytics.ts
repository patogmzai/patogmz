// "El estudio" — analítica del historial de apuestas. Funciones puras sobre Bet[].
import { betPL } from "./format";
import type { Bet } from "./types";

export interface Summary {
  n: number;
  wins: number;
  losses: number;
  pushes: number;
  staked: number;
  pl: number;
  roi: number | null; // % ; null si no se apostó nada
}
export interface Segment extends Summary {
  key: string;
}

export const SMALL_SAMPLE = 20;

/** Solo apuestas liquidadas (win/loss/push); excluye pendientes. */
export const settledBets = (bets: Bet[]) =>
  bets.filter((b) => b.result === "win" || b.result === "loss" || b.result === "push");

export function summarize(bets: Bet[]): Summary {
  const s = settledBets(bets);
  const wins = s.filter((b) => b.result === "win").length;
  const losses = s.filter((b) => b.result === "loss").length;
  const pushes = s.filter((b) => b.result === "push").length;
  const staked = s.reduce((a, b) => a + b.stake, 0);
  const pl = s.reduce((a, b) => a + betPL(b), 0);
  return { n: s.length, wins, losses, pushes, staked, pl, roi: staked ? (pl / staked) * 100 : null };
}

export function segmentBy(bets: Bet[], keyFn: (b: Bet) => string | null): Segment[] {
  const groups = new Map<string, Bet[]>();
  for (const b of settledBets(bets)) {
    const k = keyFn(b) ?? "sin clasificar";
    const g = groups.get(k);
    if (g) g.push(b);
    else groups.set(k, [b]);
  }
  return [...groups.entries()]
    .map(([key, bs]) => ({ key, ...summarize(bs) }))
    .sort((a, b) => b.n - a.n);
}

/** Serie de ganancia acumulada (P&L) en el tiempo, ordenada por fecha. */
export function cumulativePL(bets: Bet[]): { date: string; value: number }[] {
  const s = settledBets(bets).slice().sort((a, b) => a.placed_at.localeCompare(b.placed_at));
  let run = 0;
  return s.map((b) => {
    run += betPL(b);
    return { date: b.placed_at, value: run };
  });
}

export const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const dayOfWeek = (b: Bet) => DAYS[new Date(b.placed_at).getDay()];

export function amountBucket(b: Bet): string {
  const s = b.stake;
  if (s < 150) return "< $150";
  if (s < 300) return "$150–300";
  if (s < 500) return "$300–500";
  return "≥ $500";
}

export interface Calibration {
  byTier: Segment[];
  calibrated: boolean | null; // null = muestra insuficiente
  note: string;
}

/** Validación clave: ¿los niveles altos de confianza rinden más que los bajos? */
export function calibration(bets: Bet[]): Calibration {
  const byTier = segmentBy(bets, (b) => (b.tier ? `${b.tier}` : null))
    .filter((s) => s.key !== "sin clasificar")
    .sort((a, b) => Number(b.key) - Number(a.key)); // 5★ → 1★

  const agg = (pred: (t: number) => boolean) => {
    const segs = byTier.filter((s) => pred(Number(s.key)));
    const n = segs.reduce((a, s) => a + s.n, 0);
    const pl = segs.reduce((a, s) => a + s.pl, 0);
    const st = segs.reduce((a, s) => a + s.staked, 0);
    return { n, roi: st ? (pl / st) * 100 : null };
  };
  const high = agg((t) => t >= 4);
  const low = agg((t) => t <= 2);

  if (high.n < 10 || low.n < 10 || high.roi === null || low.roi === null) {
    return { byTier, calibrated: null, note: "Muestra insuficiente para validar la calibración — registra más apuestas en niveles altos y bajos." };
  }
  const calibrated = high.roi > low.roi;
  return {
    byTier,
    calibrated,
    note: calibrated
      ? `Calibrado: niveles altos (4–5★: ${high.roi.toFixed(1)}%) rinden más que bajos (1–2★: ${low.roi.toFixed(1)}%).`
      : `Mal calibrado: niveles altos (4–5★: ${high.roi.toFixed(1)}%) NO superan a los bajos (1–2★: ${low.roi.toFixed(1)}%). La confianza no está prediciendo valor.`,
  };
}

export function bestWorst(segs: Segment[], minN = SMALL_SAMPLE): { best: Segment | null; worst: Segment | null } {
  const elig = segs.filter((s) => s.n >= minN && s.roi !== null);
  if (elig.length === 0) return { best: null, worst: null };
  const sorted = elig.slice().sort((a, b) => (b.roi as number) - (a.roi as number));
  return { best: sorted[0], worst: sorted[sorted.length - 1] };
}
