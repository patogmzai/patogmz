"use client";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, BarChart3, Target, AlertTriangle } from "lucide-react";
import { fmt } from "@/lib/format";
import {
  summarize, segmentBy, cumulativePL, calibration, bestWorst,
  dayOfWeek, amountBucket, SMALL_SAMPLE, type Segment,
} from "@/lib/analytics";
import type { Bet } from "@/lib/types";

const SPORT_LABEL: Record<string, string> = { futbol: "Fútbol", nfl: "NFL", nba: "NBA", otros: "MLB · Tenis · UFC" };

function Sparkline({ points }: { points: { value: number }[] }) {
  if (points.length < 2) return <div className="empty">Necesitas al menos 2 apuestas liquidadas para la gráfica.</div>;
  const W = 600, H = 160, pad = 8;
  const vals = points.map((p) => p.value);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1].value;
  const color = last >= 0 ? "var(--pos)" : "var(--neg)";
  const zeroY = y(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 160, display: "block" }}>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />
      <path d={`${d} L${x(points.length - 1)},${zeroY} L${x(0)},${zeroY} Z`} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function SegmentTable({ title, segments, keyLabel }: { title: string; segments: Segment[]; keyLabel?: (k: string) => string }) {
  if (segments.length === 0) return null;
  return (
    <div className="card card-pad" style={{ marginTop: 13 }}>
      <div className="card-h" style={{ marginBottom: 10 }}>{title}</div>
      <table className="tbl">
        <thead><tr><th>Segmento</th><th>n</th><th>G–P</th><th>ROI</th></tr></thead>
        <tbody>
          {segments.map((s) => (
            <tr key={s.key}>
              <td>{keyLabel ? keyLabel(s.key) : s.key}{s.n < SMALL_SAMPLE && <span className="tag" title="Muestra chica: no es conclusión">muestra chica</span>}</td>
              <td className="mono">{s.n}</td>
              <td className="mono">{s.wins}–{s.losses}</td>
              <td className={"mono " + (s.roi == null ? "" : s.roi >= 0 ? "up" : "down")}>
                {s.roi == null ? "—" : `${s.roi >= 0 ? "+" : ""}${s.roi.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Estudio({ bets }: { bets: Bet[] }) {
  const a = useMemo(() => {
    const s = summarize(bets);
    const cal = calibration(bets);
    const bySport = segmentBy(bets, (b) => b.sport);
    const byLeague = segmentBy(bets, (b) => b.league);
    const byMarket = segmentBy(bets, (b) => b.market);
    const byAmount = segmentBy(bets, amountBucket);
    const byDay = segmentBy(bets, dayOfWeek);
    const byKind = segmentBy(bets, (b) => b.kind);
    const combined: Segment[] = [
      ...bySport.map((x) => ({ ...x, key: `Deporte: ${SPORT_LABEL[x.key] ?? x.key}` })),
      ...byLeague.filter((x) => x.key !== "sin clasificar").map((x) => ({ ...x, key: `Liga: ${x.key}` })),
      ...byMarket.map((x) => ({ ...x, key: `Mercado: ${x.key}` })),
    ];
    return { s, cal, bySport, byLeague, byMarket, byAmount, byDay, byKind, cum: cumulativePL(bets), bw: bestWorst(combined) };
  }, [bets]);

  const { s } = a;

  return (
    <div className="sv-root">
      <div className="sv-wrap">
        <header className="sv-head">
          <div className="sv-brand">
            <h1 className="disp">El estudio</h1>
            <div className="sub">analítica honesta de tu historial · {s.n} apuestas liquidadas</div>
          </div>
          <Link href="/" className="refresh-btn"><ArrowLeft size={13} /> Volver al panel</Link>
        </header>

        {s.n === 0 ? (
          <div className="empty">Aún no hay apuestas liquidadas. Registra y marca resultados en el panel; aquí se construye el estudio.</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="kpi-row">
              <div className="kpi"><div className="kpi-l">ROI</div><div className={"kpi-v " + (s.roi! >= 0 ? "up" : "down")}>{s.roi! >= 0 ? "+" : ""}{s.roi!.toFixed(1)}%</div></div>
              <div className="kpi"><div className="kpi-l">Ganancia neta</div><div className={"kpi-v " + (s.pl >= 0 ? "up" : "down")}>{s.pl >= 0 ? "+" : ""}{fmt(s.pl)}</div></div>
              <div className="kpi"><div className="kpi-l">Récord G–P</div><div className="kpi-v">{s.wins}–{s.losses}</div></div>
              <div className="kpi"><div className="kpi-l">Total apostado</div><div className="kpi-v dim">{fmt(s.staked)}</div></div>
            </div>

            {/* Gráfica acumulada */}
            <div className="card card-pad" style={{ marginTop: 13 }}>
              <div className="card-h" style={{ marginBottom: 10 }}><TrendingUp size={13} /> Ganancia acumulada</div>
              <Sparkline points={a.cum} />
            </div>

            {/* Calibración — la validación clave */}
            <div className={"calib " + (a.cal.calibrated === false ? "bad" : a.cal.calibrated ? "good" : "warn")}>
              {a.cal.calibrated === false ? <AlertTriangle size={16} /> : <Target size={16} />}
              <div>
                <div className="calib-t">Calibración de la confianza {a.cal.calibrated === false && "— revisar"}</div>
                <div className="calib-s">{a.cal.note}</div>
              </div>
            </div>
            <SegmentTable title="Por nivel de confianza" segments={a.cal.byTier} keyLabel={(k) => `${k}★`} />

            {/* Mejor / peor */}
            {(a.bw.best || a.bw.worst) && (
              <div className="bw-row">
                {a.bw.best && <div className="bw good"><div className="bw-l">Dónde ganas</div><div className="bw-k">{a.bw.best.key}</div><div className="bw-v up">+{a.bw.best.roi!.toFixed(1)}% · {a.bw.best.n} apuestas</div></div>}
                {a.bw.worst && <div className="bw bad"><div className="bw-l">Dónde sangras</div><div className="bw-k">{a.bw.worst.key}</div><div className="bw-v down">{a.bw.worst.roi!.toFixed(1)}% · {a.bw.worst.n} apuestas</div></div>}
              </div>
            )}

            {/* Desgloses */}
            <div className="card-h" style={{ fontSize: 11, margin: "20px 0 0" }}><BarChart3 size={13} /> Desgloses</div>
            <SegmentTable title="Por deporte" segments={a.bySport} keyLabel={(k) => SPORT_LABEL[k] ?? k} />
            <SegmentTable title="Por liga" segments={a.byLeague} />
            <SegmentTable title="Por mercado" segments={a.byMarket} />
            <SegmentTable title="Por tipo" segments={a.byKind} />
            <SegmentTable title="Por monto" segments={a.byAmount} />
            <SegmentTable title="Por día de la semana" segments={a.byDay} />

            <div className="foot" style={{ marginTop: 20 }}>
              <AlertTriangle size={16} style={{ color: "var(--gold)", flexShrink: 0 }} />
              <p>Los segmentos con <b>muestra chica</b> (&lt; {SMALL_SAMPLE} apuestas) no son conclusión — la varianza domina. El estudio gana sentido con volumen. Los datos de confianza/mercado/deporte solo existen para apuestas registradas a partir de la actualización; las viejas salen como &quot;sin clasificar&quot;.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
