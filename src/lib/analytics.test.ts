import { describe, it, expect } from "vitest";
import { summarize, segmentBy, cumulativePL, calibration, bestWorst } from "./analytics";
import type { Bet } from "./types";

const mk = (over: Partial<Bet>): Bet => ({
  id: Math.random().toString(36).slice(2),
  placed_at: "2026-06-20T12:00:00Z",
  league: null, pick: "x", odds: 2.0, stake: 100, result: "pending", kind: "single",
  fair_prob: null, tier: null, market: null, sport: null, opportunity_id: null, created_at: "2026-06-20T12:00:00Z",
  ...over,
});

describe("analytics · summarize", () => {
  it("ROI correcto y excluye pendientes", () => {
    const bets = [
      mk({ result: "win", odds: 2.0, stake: 100 }),  // +100
      mk({ result: "loss", stake: 100 }),             // -100
      mk({ result: "win", odds: 1.5, stake: 200 }),   // +100
      mk({ result: "pending", stake: 999 }),          // ignorada
    ];
    const s = summarize(bets);
    expect(s.n).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.staked).toBe(400);
    expect(s.pl).toBeCloseTo(100, 6);
    expect(s.roi).toBeCloseTo(25, 6);
  });
});

describe("analytics · segmentBy", () => {
  it("agrupa y etiqueta null como 'sin clasificar'", () => {
    const bets = [
      mk({ result: "win", sport: "nfl", odds: 2, stake: 100 }),
      mk({ result: "loss", sport: "nfl", stake: 100 }),
      mk({ result: "win", sport: null, odds: 2, stake: 100 }),
    ];
    const segs = segmentBy(bets, (b) => b.sport);
    const nfl = segs.find((s) => s.key === "nfl")!;
    expect(nfl.n).toBe(2);
    expect(segs.find((s) => s.key === "sin clasificar")!.n).toBe(1);
  });
});

describe("analytics · cumulativePL", () => {
  it("suma corrida ordenada por fecha", () => {
    const bets = [
      mk({ result: "loss", stake: 100, placed_at: "2026-06-19T12:00:00Z" }),
      mk({ result: "win", odds: 2, stake: 100, placed_at: "2026-06-20T12:00:00Z" }),
    ];
    const c = cumulativePL(bets);
    expect(c).toHaveLength(2);
    expect(c[0].value).toBeCloseTo(-100, 6);
    expect(c[1].value).toBeCloseTo(0, 6);
  });
});

describe("analytics · calibration", () => {
  it("muestra chica → veredicto null", () => {
    const bets = [mk({ result: "win", tier: 5, odds: 2, stake: 100 })];
    expect(calibration(bets).calibrated).toBeNull();
  });

  it("detecta mal calibrado (5★ pierde, 2★ gana)", () => {
    const bets = [
      ...Array.from({ length: 10 }, () => mk({ result: "loss", tier: 5, stake: 100 })),
      ...Array.from({ length: 10 }, () => mk({ result: "win", tier: 2, odds: 2, stake: 100 })),
    ];
    const c = calibration(bets);
    expect(c.calibrated).toBe(false);
    expect(c.note).toContain("Mal calibrado");
  });
});

describe("analytics · bestWorst", () => {
  it("respeta tamaño mínimo de muestra", () => {
    const segs = [
      { key: "a", n: 5, wins: 5, losses: 0, pushes: 0, staked: 500, pl: 500, roi: 100 },
      { key: "b", n: 30, wins: 20, losses: 10, pushes: 0, staked: 3000, pl: 300, roi: 10 },
    ];
    const { best } = bestWorst(segs, 20);
    expect(best?.key).toBe("b"); // 'a' tiene muestra chica, se ignora
  });
});
