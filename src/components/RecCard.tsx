import { Layers, Plus, CircleCheck, Clock } from "lucide-react";
import { decToAmerican } from "@/lib/betting";
import { fmtGameTime } from "@/lib/format";
import { TIER_COLOR, TIER_WORD, LEAGUE_COLOR } from "@/lib/ui";
import type { ComputedOpportunity } from "@/lib/types";

interface Props {
  o: ComputedOpportunity;
  units: string;
  muted?: boolean;
  inParlay: boolean;
  registered: boolean;
  blocked?: boolean; // stop-loss activado
  onAdd: () => void;
  onParlay: () => void;
  playdoit: string;
  onPlaydoit: (v: string) => void;
}

export default function RecCard({ o, units, muted, inParlay, registered, blocked, onAdd, onParlay, playdoit, onPlaydoit }: Props) {
  const tc = TIER_COLOR[o.tier];
  const lc = LEAGUE_COLOR[o.league] || "#888";
  const hasPD = o.playdoit != null;
  // Momio JUSTO (break-even): si Playdoit paga MÁS que esto, hay valor. Es el número que importa.
  const fairOdds = o.fair_prob > 0 ? 1 / o.fair_prob : 0;
  const beatsFair = hasPD && o.playdoit! > fairOdds;
  return (
    <div className={"rec" + (muted ? " muted" : "")} style={!muted ? { borderColor: tc + "55" } : {}}>
      {!muted && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: tc }} />}
      <div className="rec-top">
        <div className="rec-tl">
          <span className="league" style={{ color: lc, background: lc + "1f", border: "1px solid " + lc + "3a" }}>{o.league}</span>
          <span className="mkt">{o.market}</span>
        </div>
        <div className="conf">
          <div style={{ textAlign: "right" }}>
            <div className="conf-label">confianza</div>
          </div>
          <div className="conf-pips">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="conf-pip" style={n <= o.tier ? { background: tc } : {}} />
            ))}
          </div>
          <div className="conf-badge" style={{ background: tc + "22", color: tc, border: "1px solid " + tc + "55" }}>{o.tier}</div>
        </div>
      </div>
      <div className="matchup disp">
        {o.match}
        {o.isNew && !muted && <span className="pd-tag" style={{ background: "var(--pos-soft)", borderColor: "var(--pos-line)", color: "var(--pos)" }}>NUEVA</span>}
        {o.commence_time && <span className="game-time"><Clock size={11} /> {fmtGameTime(o.commence_time)}</span>}
      </div>
      <div className="pickline">
        Pick: <b>{o.pick}</b>
        {hasPD && <span className="pd-tag">Playdoit {o.playdoit!.toFixed(2)}</span>}
      </div>

      {/* El número que importa para ti: el momio justo (break-even) */}
      {!muted && (
        <div className="fair-target">
          En Playdoit busca pagar <b>≥ {fairOdds.toFixed(2)}</b> ({decToAmerican(fairOdds)}) para que haya valor
          <span className="ref">· ref. Europa {o.odds.toFixed(2)} (no es Playdoit)</span>
        </div>
      )}

      <div className="rec-stats">
        <div className="rs">prob. de acierto <span className="n">{(o.fair_prob * 100).toFixed(0)}%</span></div>
        <div className="rs">momio justo <span className="n">{fairOdds.toFixed(2)}</span></div>
        <div className="rs">nivel <span className="n" style={{ color: tc }}>{TIER_WORD[o.tier]}</span></div>
        {hasPD && <div className="rs">tu valor <span className="n" style={{ color: o.effEv > 0 ? "var(--pos)" : "var(--neg)" }}>{o.effEv >= 0 ? "+" : ""}{(o.effEv * 100).toFixed(1)}%</span></div>}
      </div>
      {!muted && (
        <>
          <div className="pd-row">
            <label>Momio Playdoit</label>
            <input value={playdoit} placeholder={fairOdds.toFixed(2)} inputMode="decimal"
              onChange={(e) => onPlaydoit(e.target.value)} aria-label="Momio real de Playdoit" />
            {hasPD ? (
              <span className="pd-cmp">justo {fairOdds.toFixed(2)} · <span className={beatsFair ? "better" : "worse"}>{beatsFair ? "hay valor ✓" : "sin valor"}</span></span>
            ) : (
              <span className="pd-cmp">mete tu momio de Playdoit → te digo si hay valor</span>
            )}
          </div>
          {hasPD && o.effEv <= 0 && <div className="pd-warn">A este precio de Playdoit no hay valor — mejor no apostar.</div>}
          <div className="stake-row">
            <div className="stake-info">
              <div className="lab">Monto sugerido</div>
              <div className="amt">
                <span className="c">$</span>
                {Math.round(o.stake).toLocaleString("es-MX")}
                <span style={{ fontSize: 13, color: "var(--dim)", fontFamily: "IBM Plex Mono", fontWeight: 400 }}> · {units}u</span>
              </div>
              <div className="meta">{hasPD ? (o.stake >= o.cap ? "topado a tu unidad" : "Kelly · a tu momio Playdoit") : "estimado — confirma Playdoit"}</div>
            </div>
            <div className="rec-actions">
              <button className="btn par" data-on={inParlay ? 1 : 0} onClick={onParlay}>
                <Layers size={14} /> {inParlay ? "En parlay" : "Parlay"}
              </button>
              <button className={"btn go" + (registered ? " done" : "")} onClick={onAdd} disabled={registered || blocked}
                title={blocked ? "Stop-loss activado — pausa" : undefined}>
                {registered ? (
                  <><CircleCheck size={14} /> Registrada</>
                ) : blocked ? (
                  <>En pausa</>
                ) : (
                  <><Plus size={14} /> Registrar</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
