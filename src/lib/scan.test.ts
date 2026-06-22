import { describe, it, expect } from "vitest";
import { marketOpportunities } from "./scan";
import type { LeagueConfig } from "./leagues";
import type { OddsEvent } from "./odds";

const league: LeagueConfig = { key: "x", label: "NBA", sport: "nba", markets: ["h2h"] };

// Pinnacle 2.00/2.00 (justo 50/50). Un libro blando paga 2.20 al local.
const h2hEvent: OddsEvent = {
  id: "e1",
  home_team: "Celtics",
  away_team: "Suns",
  commence_time: "2026-06-22T00:00:00Z",
  bookmakers: [
    { key: "pinnacle", title: "Pinnacle", markets: [{ key: "h2h", outcomes: [
      { name: "Celtics", price: 2.0 }, { name: "Suns", price: 2.0 },
    ] }] },
    { key: "softbook", title: "Soft", markets: [{ key: "h2h", outcomes: [
      { name: "Celtics", price: 2.2 }, { name: "Suns", price: 1.8 },
    ] }] },
  ],
};

describe("marketOpportunities · h2h", () => {
  const opps = marketOpportunities(h2hEvent, league, "h2h");

  it("detecta valor en el lado que el libro blando sobrepaga", () => {
    expect(opps).toHaveLength(1);
    const o = opps[0];
    expect(o.pick).toBe("Celtics");
    expect(o.fair_prob).toBeCloseTo(0.5, 5);
    expect(o.odds).toBe(2.2);        // mejor momio ofrecido
    expect(o.sharp_odds).toBe(2.0);  // línea de Pinnacle
    expect(o.ev).toBeCloseTo(0.1, 5); // 0.5*2.2 - 1
    expect(o.tier).toBe(5);          // EV 10% con p=0.5
  });

  it("no guarda el lado sin valor (mejor momio = Pinnacle)", () => {
    expect(opps.find((o) => o.pick === "Suns")).toBeUndefined();
  });
});

describe("marketOpportunities · sin ancla sharp", () => {
  it("ignora el evento si Pinnacle no está", () => {
    const noSharp: OddsEvent = { ...h2hEvent, bookmakers: h2hEvent.bookmakers.filter((b) => b.key !== "pinnacle") };
    expect(marketOpportunities(noSharp, league, "h2h")).toHaveLength(0);
  });
});

describe("marketOpportunities · totals (agrupa por punto)", () => {
  const totalsEvent: OddsEvent = {
    id: "e2",
    home_team: "Chiefs",
    away_team: "Bills",
    commence_time: "2026-06-22T00:00:00Z",
    bookmakers: [
      { key: "pinnacle", title: "Pinnacle", markets: [{ key: "totals", outcomes: [
        { name: "Over", price: 1.95, point: 47.5 }, { name: "Under", price: 1.95, point: 47.5 },
      ] }] },
      { key: "softbook", title: "Soft", markets: [{ key: "totals", outcomes: [
        { name: "Over", price: 2.1, point: 47.5 }, { name: "Under", price: 1.75, point: 47.5 },
      ] }] },
    ],
  };

  it("arma el pick 'Más de 47.5' con el mejor momio", () => {
    const opps = marketOpportunities(totalsEvent, { ...league, label: "NFL", sport: "nfl" }, "totals");
    expect(opps).toHaveLength(1);
    expect(opps[0].pick).toBe("Más de 47.5");
    expect(opps[0].odds).toBe(2.1);
    expect(opps[0].market).toBe("Total");
  });
});
