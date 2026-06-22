"use client";
import { useMemo } from "react";
import { Layers, Plus, Info, Clock } from "lucide-react";
import { parlay as calcParlay, decToAmerican } from "@/lib/betting";
import { fmt, fmtGameTime } from "@/lib/format";
import { TIER_COLOR, LEAGUE_COLOR } from "@/lib/ui";
import type { ComputedOpportunity } from "@/lib/types";

interface Props {
  opportunities: ComputedOpportunity[];
  currentBank: number;
  kellyFrac: number;
  unitPct: number;
  blocked?: boolean; // stop-loss activado
  onRegister: (pick: string, odds: number, stake: number, fairProb: number) => void;
}

interface SuggestedParlay {
  legs: ComputedOpportunity[];
  oddsComb: number;
  probComb: number;
  ev: number;
  stake: number;
  payout: number;
}

function buildParlays(opps: ComputedOpportunity[], bank: number, frac: number, unitPct: number): SuggestedParlay[] {
  // Solo oportunidades con valor real y confianza >= 3
  const best = opps
    .filter((o) => o.effEv > 0 && o.tier >= 3 && o.commence_time)
    .sort((a, b) => b.tier - a.tier || b.effEv - a.effEv);

  if (best.length < 2) return [];

  const parlays: SuggestedParlay[] = [];

  // Evitar patas del mismo partido
  const sameMatch = (a: ComputedOpportunity, b: ComputedOpportunity) => a.match === b.match;

  // 2-leg parlays: las mejores combinaciones
  for (let i = 0; i < Math.min(best.length, 6); i++) {
    for (let j = i + 1; j < Math.min(best.length, 6); j++) {
      if (sameMatch(best[i], best[j])) continue;
      const legs = [best[i], best[j]];
      const p = calcParlay(legs.map((l) => ({ odds: l.effOdds, fairProb: l.fair_prob })), bank, frac, unitPct);
      if (p.ev > 0) {
        parlays.push({ legs, ...p, payout: p.stake * p.oddsComb });
      }
    }
  }

  // 3-leg parlays
  for (let i = 0; i < Math.min(best.length, 5); i++) {
    for (let j = i + 1; j < Math.min(best.length, 5); j++) {
      for (let k = j + 1; k < Math.min(best.length, 5); k++) {
        if (sameMatch(best[i], best[j]) || sameMatch(best[i], best[k]) || sameMatch(best[j], best[k])) continue;
        const legs = [best[i], best[j], best[k]];
        const p = calcParlay(legs.map((l) => ({ odds: l.effOdds, fairProb: l.fair_prob })), bank, frac, unitPct);
        if (p.ev > 0) {
          parlays.push({ legs, ...p, payout: p.stake * p.oddsComb });
        }
      }
    }
  }

  // Rankear por EV y tomar los top 3
  return parlays.sort((a, b) => b.ev - a.ev).slice(0, 3);
}

export default function AutoParlays({ opportunities, currentBank, kellyFrac, unitPct, blocked, onRegister }: Props) {
  const parlays = useMemo(
    () => buildParlays(opportunities, currentBank, kellyFrac, unitPct),
    [opportunities, currentBank, kellyFrac, unitPct]
  );

  if (parlays.length === 0) return null;

  return (
    <div className="auto-parlays">
      <div className="card-h" style={{ color: "var(--gold)", fontSize: 11, marginBottom: 13 }}>
        <Layers size={13} /> Parlays sugeridos del día — generados automáticamente
      </div>

      {parlays.map((p, idx) => (
        <div key={idx} className="aparlay">
          <div className="aparlay-badge">{p.legs.length} patas · {p.ev >= 0 ? "+" : ""}{(p.ev * 100).toFixed(1)}% EV</div>
          <div className="aparlay-legs">
            {p.legs.map((leg) => {
              const tc = TIER_COLOR[leg.tier];
              const lc = LEAGUE_COLOR[leg.league] || "#888";
              return (
                <div key={leg.id} className="aparlay-leg">
                  <div className="aparlay-leg-left">
                    <span className="league" style={{ color: lc, background: lc + "1f", border: "1px solid " + lc + "3a", fontSize: 9, padding: "2px 6px" }}>{leg.league}</span>
                    <span className="aparlay-leg-pick"><b>{leg.pick}</b> · {leg.match}</span>
                    {leg.commence_time && <span className="aparlay-leg-time"><Clock size={10} /> {fmtGameTime(leg.commence_time)}</span>}
                  </div>
                  <div className="aparlay-leg-right">
                    <span className="od">{leg.effOdds.toFixed(2)}</span>
                    <div className="conf-pips" style={{ gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="conf-pip" style={{ width: 6, height: 12, borderRadius: 2, ...(n <= leg.tier ? { background: tc } : {}) }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="aparlay-footer">
            <div className="aparlay-stat">
              <span className="l">Momio</span>
              <span className="v">{p.oddsComb.toFixed(2)} <span style={{ color: "var(--faint)", fontSize: 11 }}>{decToAmerican(p.oddsComb)}</span></span>
            </div>
            <div className="aparlay-stat">
              <span className="l">Prob.</span>
              <span className="v">{(p.probComb * 100).toFixed(1)}%</span>
            </div>
            <div className="aparlay-stat">
              <span className="l">Valor</span>
              <span className="v" style={{ color: p.ev > 0 ? "var(--pos)" : "var(--neg)" }}>{p.ev >= 0 ? "+" : ""}{(p.ev * 100).toFixed(1)}%</span>
            </div>
            <div className="aparlay-stat">
              <span className="l">Apostar → pago</span>
              <span className="v big">{fmt(p.stake)} <span style={{ color: "var(--dim)", fontSize: 12 }}>→ {fmt(p.payout)}</span></span>
            </div>
          </div>
          <div className="aparlay-actions">
            <button className="btn go" disabled={blocked} title={blocked ? "Stop-loss activado — pausa" : undefined}
              onClick={() => onRegister(
                p.legs.map((l) => l.pick).join(" + "),
                Number(p.oddsComb.toFixed(2)),
                Math.round(p.stake),
                Number(p.probComb.toFixed(5))
              )}>
              <Plus size={14} /> {blocked ? "En pausa" : "Registrar parlay"}
            </button>
          </div>
          <div className="aparlay-warn">
            <Info size={12} /> Patas de partidos distintos (independientes). El monto va topado a {(unitPct * 0.4).toFixed(1)}% de la banca por varianza.
          </div>
        </div>
      ))}
    </div>
  );
}
