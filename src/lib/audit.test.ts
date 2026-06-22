// Vectores de auditoría — verifican lib/betting.ts contra valores conocidos.
import { describe, it, expect } from "vitest";
import { impliedProb, devig, evPct, confTier, kellyFull, kellyStake, parlay } from "./betting";

describe("AUDITORÍA · vectores exactos", () => {
  it("impProb 1/1.90 = 0.5263", () => {
    expect(impliedProb(1.9)).toBeCloseTo(0.5263, 4);
  });

  it("de-vig two-way Pinnacle 1.90/2.00 → 0.5128 / 0.4872", () => {
    const f = devig([1.9, 2.0]);
    expect(f[0]).toBeCloseTo(0.5128, 4);
    expect(f[1]).toBeCloseTo(0.4872, 4);
  });

  it("EV(p=0.55, odds=1.90) = +4.5%", () => {
    expect(evPct(0.55, 1.9)).toBeCloseTo(0.045, 4);
  });

  it("confTier(ev=0.04, p=0.65) = 5 (boost favorito)", () => {
    expect(confTier(0.04, 0.65)).toBe(5);
  });

  it("confTier(ev=0.05, p=0.29) ≤ 3 (cap longshot)", () => {
    expect(confTier(0.05, 0.29)).toBeLessThanOrEqual(3);
  });

  it("kellyFull(p=0.65, odds=1.60) = 0.0667", () => {
    expect(kellyFull(0.65, 1.6)).toBeCloseTo(0.0667, 4);
  });

  it("parlay 1.60(.65) + 1.90(.55) → odds 3.04, prob 0.3575, EV 0.0868", () => {
    const r = parlay([{ odds: 1.6, fairProb: 0.65 }, { odds: 1.9, fairProb: 0.55 }], 20000, 0.25, 3);
    expect(r.oddsComb).toBeCloseTo(3.04, 4);
    expect(r.probComb).toBeCloseTo(0.3575, 4);
    expect(r.ev).toBeCloseTo(0.0868, 4);
  });
});

describe("AUDITORÍA · casos borde (no debe tronar)", () => {
  it("EV negativo → stake 0", () => {
    expect(kellyStake(0.45, 1.9, 20000, 0.25, 3)).toBe(0);
  });

  it("odds = 1 → sin división por cero, stake 0", () => {
    const s = kellyStake(0.5, 1, 20000, 0.25, 3);
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBe(0);
  });

  it("slate vacío → devig([]) no truena", () => {
    expect(() => devig([])).not.toThrow();
  });

  it("parlay de 1 sola pata se comporta como simple", () => {
    const r = parlay([{ odds: 1.9, fairProb: 0.55 }], 20000, 0.25, 3);
    expect(r.oddsComb).toBeCloseTo(1.9, 6);
    expect(r.ev).toBeCloseTo(0.045, 4);
  });

  it("banca en 0 → stake 0, sin NaN", () => {
    const s = kellyStake(0.65, 1.6, 0, 0.25, 3);
    expect(s).toBe(0);
    expect(Number.isNaN(s)).toBe(false);
  });
});
