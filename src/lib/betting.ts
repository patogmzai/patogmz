// ============================================================
// Matemática determinística del Scanner de Valor.
// Port exacto de scanner-de-valor.jsx + de-vig multiplicativo (spec §5).
//
// Regla de oro: NADA aquí usa azar ni LLM. Mismo input → mismo output.
// La confianza mide la FUERZA DEL VALOR (edge), no predice el resultado.
// ============================================================

/** Probabilidad implícita de un momio decimal. impProb = 1 / odds. */
export function impliedProb(oddsDecimal: number): number {
  return 1 / oddsDecimal;
}

/**
 * Quita el vig (momio justo) por método multiplicativo sobre el libro sharp.
 * Recibe los momios decimales de las N salidas del mercado (Pinnacle/consenso)
 * y devuelve las probabilidades justas, que SUMAN 1.
 *
 *   impProb_i  = 1 / o_i
 *   overround  = Σ impProb_j
 *   fairProb_i = impProb_i / overround
 */
export function devig(sharpOdds: number[]): number[] {
  const imp = sharpOdds.map(impliedProb);
  const overround = imp.reduce((s, p) => s + p, 0);
  return imp.map((p) => p / overround);
}

/** Valor esperado decimal. EV = fairProb * momioOfrecido - 1. (0.04 = +4%) */
export function evPct(fairProb: number, oddsOfrecido: number): number {
  return fairProb * oddsOfrecido - 1;
}

/** Fracción de Kelly completo. Puede ser negativa (= no hay edge, no apostar). */
export function kellyFull(p: number, odds: number): number {
  const b = odds - 1;
  return (b * p - (1 - p)) / b;
}

/**
 * Confianza 1–5: fuerza del valor (EV) modulada por probabilidad/varianza.
 * Port directo del prototipo. NO es probabilidad de ganar — un 5★ también pierde.
 */
export function confTier(ev: number, p: number): number {
  const e = ev * 100;
  let t = e >= 6 ? 5 : e >= 4 ? 4 : e >= 2.5 ? 3 : e >= 1 ? 2 : 1;
  if (p < 0.3) t = Math.min(t, 3); // longshot: alta varianza, capado
  if (p < 0.18) t = Math.min(t, 2);
  if (p >= 0.62 && e >= 2.5) t = Math.min(5, t + 1); // favorito sólido con edge real
  return t;
}

/**
 * Stake por Kelly fraccionado sobre la banca actual, topado a la unidad.
 * Devuelve 0 si no hay edge (Kelly completo <= 0).
 */
export function kellyStake(
  p: number,
  odds: number,
  bank: number,
  frac: number,
  unitPct: number
): number {
  const b = odds - 1;
  const f = (b * p - (1 - p)) / b; // Kelly completo
  if (f <= 0) return 0;
  const cap = bank * (unitPct / 100);
  return Math.min(bank * frac * f, cap);
}

export interface ParlayLeg {
  odds: number;
  fairProb: number;
}

export interface ParlayResult {
  oddsComb: number;
  probComb: number;
  ev: number;
  stake: number;
}

/**
 * Parlay asumiendo INDEPENDENCIA entre patas.
 * Advertencia (para la UI): patas del mismo partido están correlacionadas;
 * este cálculo asume independencia. El parlay multiplica valor Y varianza,
 * por eso el tope de unidad va reducido (× 0.4).
 *
 *   oddsComb = Π odds_i
 *   probComb = Π fairProb_i
 *   evParlay = probComb * oddsComb - 1
 *   stake    = kellyStake(probComb, oddsComb, bank, frac, unitPct * 0.4)
 */
export function parlay(
  legs: ParlayLeg[],
  bank: number,
  frac: number,
  unitPct: number
): ParlayResult {
  const oddsComb = legs.reduce((m, l) => m * l.odds, 1);
  const probComb = legs.reduce((m, l) => m * l.fairProb, 1);
  const ev = probComb * oddsComb - 1;
  const stake = kellyStake(probComb, oddsComb, bank, frac, unitPct * 0.4);
  return { oddsComb, probComb, ev, stake };
}

/** Momio decimal → americano (solo para mostrar). */
export function decToAmerican(d: number): string {
  return d >= 2 ? "+" + Math.round((d - 1) * 100) : "-" + Math.round(100 / (d - 1));
}

/** Momio americano → decimal (para ingerir momios que la API entregue en formato US). */
export function americanToDecimal(american: number): number {
  return american > 0 ? american / 100 + 1 : 100 / -american + 1;
}
