import { describe, it, expect } from "vitest";
import {
  impliedProb,
  devig,
  evPct,
  kellyFull,
  confTier,
  kellyStake,
  parlay,
  decToAmerican,
  americanToDecimal,
} from "./betting";

describe("impliedProb", () => {
  it("invierte el momio decimal", () => {
    expect(impliedProb(2.0)).toBeCloseTo(0.5, 10);
    expect(impliedProb(1.5)).toBeCloseTo(0.6667, 4);
  });
});

describe("devig (multiplicativo)", () => {
  it("mercado 2-way simétrico: 50/50 limpio", () => {
    const f = devig([1.9, 1.9]);
    expect(f[0]).toBeCloseTo(0.5, 10);
    expect(f[1]).toBeCloseTo(0.5, 10);
  });

  it("siempre suma 1 (2-way asimétrico)", () => {
    const f = devig([1.6, 2.5]);
    expect(f.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
    // favorito mantiene mayor probabilidad
    expect(f[0]).toBeGreaterThan(f[1]);
  });

  it("siempre suma 1 (3-way / 1X2)", () => {
    const f = devig([2.5, 3.4, 3.0]);
    expect(f.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
    expect(f).toHaveLength(3);
  });
});

describe("evPct", () => {
  it("EV positivo cuando el momio ofrecido paga de más", () => {
    // fairProb 0.55 contra momio 1.90 → 0.55*1.90 - 1 = 0.045
    expect(evPct(0.55, 1.9)).toBeCloseTo(0.045, 10);
  });
  it("EV cero en el momio justo", () => {
    // fair 0.5 → momio justo 2.0
    expect(evPct(0.5, 2.0)).toBeCloseTo(0, 10);
  });
  it("EV negativo cuando el momio paga de menos", () => {
    expect(evPct(0.5, 1.8)).toBeCloseTo(-0.1, 10);
  });
});

describe("kellyFull", () => {
  it("fracción correcta con edge", () => {
    // p=0.55, odds=1.90 → b=0.9, (0.9*0.55 - 0.45)/0.9 = 0.05
    expect(kellyFull(0.55, 1.9)).toBeCloseTo(0.05, 10);
  });
  it("negativo sin edge", () => {
    expect(kellyFull(0.45, 1.9)).toBeLessThan(0);
  });
});

describe("confTier", () => {
  it("escala base por EV con p neutra (0.50)", () => {
    expect(confTier(0.07, 0.5)).toBe(5); // e=7
    expect(confTier(0.05, 0.5)).toBe(4); // e=5
    expect(confTier(0.03, 0.5)).toBe(3); // e=3
    expect(confTier(0.015, 0.5)).toBe(2); // e=1.5
    expect(confTier(0.005, 0.5)).toBe(1); // e=0.5
  });

  it("longshot p<0.30 capa a 3★", () => {
    expect(confTier(0.07, 0.25)).toBe(3); // sería 5, capado
  });

  it("longshot extremo p<0.18 capa a 2★", () => {
    expect(confTier(0.07, 0.15)).toBe(2);
  });

  it("favorito sólido (p>=0.62, e>=2.5) sube un nivel", () => {
    expect(confTier(0.03, 0.65)).toBe(4); // base 3 → +1
  });

  it("el bono de favorito no rebasa 5★", () => {
    expect(confTier(0.07, 0.65)).toBe(5); // base 5, min(5, 5+1)
  });

  it("favorito sin edge suficiente (e<2.5) no recibe bono", () => {
    expect(confTier(0.015, 0.65)).toBe(2); // base 2, sin bono
  });
});

describe("kellyStake", () => {
  it("Kelly fraccionado por debajo del tope", () => {
    // p=0.55, odds=1.90, bank=20000, frac=0.25, unit=3%
    // kellyFull=0.05 → raw = 20000*0.25*0.05 = 250; cap = 600 → 250
    expect(kellyStake(0.55, 1.9, 20000, 0.25, 3)).toBeCloseTo(250, 6);
  });

  it("topa a la unidad cuando Kelly pide de más", () => {
    // p=0.65, odds=1.90, bank=20000, frac=1, unit=3% → raw ~5222, cap=600
    expect(kellyStake(0.65, 1.9, 20000, 1, 3)).toBeCloseTo(600, 6);
  });

  it("devuelve 0 sin edge", () => {
    expect(kellyStake(0.45, 1.9, 20000, 0.25, 3)).toBe(0);
  });
});

describe("parlay", () => {
  it("combina momios y probabilidades, con tope reducido", () => {
    const r = parlay(
      [
        { odds: 1.9, fairProb: 0.55 },
        { odds: 1.95, fairProb: 0.527 },
      ],
      20000,
      0.25,
      3
    );
    expect(r.oddsComb).toBeCloseTo(3.705, 6);
    expect(r.probComb).toBeCloseTo(0.28985, 6);
    expect(r.ev).toBeCloseTo(0.28985 * 3.705 - 1, 10);
    // tope efectivo = 20000 * (3*0.4)/100 = 240; raw Kelly ~136.6 < 240
    expect(r.stake).toBeCloseTo(136.58, 1);
  });

  it("una sola pata se comporta como apuesta simple", () => {
    const r = parlay([{ odds: 1.9, fairProb: 0.55 }], 20000, 0.25, 3);
    expect(r.oddsComb).toBeCloseTo(1.9, 10);
    expect(r.probComb).toBeCloseTo(0.55, 10);
  });
});

describe("conversión de momios", () => {
  it("decToAmerican", () => {
    expect(decToAmerican(2.0)).toBe("+100");
    expect(decToAmerican(2.5)).toBe("+150");
    expect(decToAmerican(1.5)).toBe("-200");
    expect(decToAmerican(1.91)).toBe("-110");
  });

  it("americanToDecimal", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 10);
    expect(americanToDecimal(-200)).toBeCloseTo(1.5, 10);
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 10);
  });

  it("ida y vuelta consistente", () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 10);
    expect(decToAmerican(2.5)).toBe("+150");
  });
});
