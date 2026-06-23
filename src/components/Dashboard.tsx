"use client";
import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity, RefreshCw, TrendingUp, ShieldCheck, Wallet, Plus, ChevronDown,
  Info, CircleCheck, CircleX, Clock, Layers, Trash2, PencilLine,
} from "lucide-react";
import { evPct, confTier, kellyStake, parlay, decToAmerican } from "@/lib/betting";
import { fmt, fmtDate, fmtAgo, betPL } from "@/lib/format";
import { LEAGUE_COLOR, SPORTS } from "@/lib/ui";
import { api } from "@/lib/api";
import type {
  Config, Opportunity, Bet, BetResult, ComputedOpportunity,
} from "@/lib/types";
import RecCard from "./RecCard";
import AutoParlays from "./AutoParlays";

interface Props {
  initialConfig: Config;
  initialOpportunities: Opportunity[];
  initialBets: Bet[];
  demo: boolean;
  dbError?: boolean;
  gated: boolean;
}

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export default function Dashboard({ initialConfig, initialOpportunities, initialBets, demo, dbError, gated }: Props) {
  const [startBank, setStartBank] = useState(initialConfig.start_bank);
  const [kellyFrac, setKellyFrac] = useState(initialConfig.kelly_frac);
  const [unitPct, setUnitPct] = useState(initialConfig.unit_pct);
  const stopLossPct = initialConfig.stop_loss_pct;

  const [opportunities] = useState<Opportunity[]>(initialOpportunities);
  const [log, setLog] = useState<Bet[]>(initialBets);
  const [minConf, setMinConf] = useState(1);
  const [sports, setSports] = useState<Record<string, boolean>>({ futbol: true, nfl: true, nba: true, otros: true });
  const [registered, setRegistered] = useState<Record<string, boolean>>({});
  const [parlayIds, setParlayIds] = useState<string[]>([]);
  const [playdoitOdds, setPlaydoitOdds] = useState<Record<string, string>>({});
  const [showMethod, setShowMethod] = useState(false);
  const [showNoValue, setShowNoValue] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [dayTab, setDayTab] = useState<"hoy" | "manana" | "futuro">("hoy");
  const [mForm, setMForm] = useState({ pick: "", odds: "", stake: "" });

  // Freshness real: el escaneo más reciente de las oportunidades cargadas.
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const lastScan = useMemo(
    () => opportunities.reduce<string | null>((m, o) => (!m || o.scanned_at > m ? o.scanned_at : m), null),
    [opportunities]
  );

  // guardar config (debounced) cuando hay DB
  const firstCfg = useRef(true);
  useEffect(() => {
    if (demo) return;
    if (firstCfg.current) { firstCfg.current = false; return; }
    const t = setTimeout(() => {
      api.updateConfig({ start_bank: startBank, kelly_frac: kellyFrac, unit_pct: unitPct })
        .catch((e) => console.error("No se pudo guardar config:", e));
    }, 600);
    return () => clearTimeout(t);
  }, [startBank, kellyFrac, unitPct, demo]);

  // ---- banca y resultados (derivados de la bitácora) ----
  const settled = log.filter((b) => b.result !== "pending");
  const settledPL = settled.reduce((s, b) => s + betPL(b), 0);
  const currentBank = startBank + settledPL;
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const roi = totalStaked ? (settledPL / totalStaked) * 100 : 0;
  const wins = settled.filter((b) => b.result === "win").length;
  const losses = settled.filter((b) => b.result === "loss").length;

  // stop-loss: ROI de lo liquidado en los últimos 7 días
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekSettled = settled.filter((b) => new Date(b.placed_at).getTime() >= weekAgo);
  const weekStaked = weekSettled.reduce((s, b) => s + b.stake, 0);
  const weekPL = weekStaked ? (weekSettled.reduce((s, b) => s + betPL(b), 0) / weekStaked) * 100 : 0;
  const stopped = weekPL <= stopLossPct;

  // ---- cálculo de oportunidades (stake depende de la banca viva) ----
  const computed: ComputedOpportunity[] = useMemo(
    () =>
      opportunities.map((o) => {
        const ev = evPct(o.fair_prob, o.odds);          // consenso → ranking
        const tier = confTier(ev, o.fair_prob);
        const pd = parseFloat(playdoitOdds[o.id]);
        const playdoit = pd > 1 ? pd : null;            // momio Playdoit confirmado
        const effOdds = playdoit ?? o.odds;             // precio efectivo
        const effEv = evPct(o.fair_prob, effOdds);
        const cap = currentBank * (unitPct / 100);
        const stake = kellyStake(o.fair_prob, effOdds, currentBank, kellyFrac, unitPct);
        const isNew = Date.now() - new Date(o.first_seen_at).getTime() < 24 * 3600 * 1000;
        return { ...o, ev, tier, playdoit, effOdds, effEv, stake, cap, isNew };
      }),
    [opportunities, currentBank, kellyFrac, unitPct, playdoitOdds]
  );

  const setPlaydoit = (id: string, val: string) =>
    setPlaydoitOdds((p) => ({ ...p, [id]: val }));

  // ---- slate por día (Hoy / Mañana / Más adelante) ----
  const dayOf = (o: ComputedOpportunity): "hoy" | "manana" | "futuro" | "pasado" => {
    if (!o.commence_time) return "futuro";
    const d = new Date(o.commence_time);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.floor((d.getTime() - startOfToday.getTime()) / (24 * 3600 * 1000));
    if (d.getTime() < now.getTime()) return "pasado";
    if (days <= 0) return "hoy";
    if (days === 1) return "manana";
    return "futuro";
  };

  const vigentes = computed.filter((o) => o.status === "vigente" && sports[o.sport]);
  const expiradas = computed.filter((o) => o.status === "expirada" && sports[o.sport]);

  const dayLabel: Record<string, string> = { hoy: "Hoy", manana: "Mañana", futuro: "Más adelante" };
  // Excluye longshots extremos (prob < 5%): ahí el de-vig es ruido, no valor real.
  const MIN_PROB = 0.05;
  const hasRealValue = (o: ComputedOpportunity) =>
    o.ev > 0 && o.tier >= minConf && o.fair_prob >= MIN_PROB;
  const countByDay = (day: string) =>
    vigentes.filter((o) => hasRealValue(o) && dayOf(o) === day).length;

  // recomendaciones del día seleccionado, ordenadas por las MEJORES (confianza, luego valor)
  const recs = vigentes
    .filter((o) => hasRealValue(o) && dayOf(o) === dayTab)
    .sort((a, b) => b.tier - a.tier || b.ev - a.ev);
  const topRecs = recs.slice(0, 3);       // los 3 mejores del día
  const restRecs = recs.slice(3);
  const newCount = vigentes.filter((o) => o.isNew && o.ev > 0 && o.tier >= minConf).length;
  const noVal = vigentes.filter((o) => o.ev <= 0 && dayOf(o) === dayTab).sort((a, b) => b.ev - a.ev);

  // ---- parlay ----
  const pLegs = computed.filter((o) => parlayIds.includes(o.id));
  const par = parlay(pLegs.map((l) => ({ odds: l.effOdds, fairProb: l.fair_prob })), currentBank, kellyFrac, unitPct);

  const unit = currentBank * 0.01;
  const toUnits = (s: number) => (unit ? (s / unit).toFixed(1) : "0.0");

  // ---- acciones (optimistas; persisten vía API cuando hay DB) ----
  const addBet = async (o: ComputedOpportunity) => {
    if (registered[o.id]) return;
    setRegistered((r) => ({ ...r, [o.id]: true }));
    const tempId = uid("r");
    const now = new Date().toISOString();
    const payload = { league: o.league, pick: o.pick, odds: o.effOdds, stake: Math.round(o.stake), kind: "single" as const, fair_prob: o.fair_prob, tier: o.tier, market: o.market, sport: o.sport, opportunity_id: o.id };
    setLog((l) => [{ id: tempId, placed_at: now, ...payload, result: "pending", created_at: now }, ...l]);
    if (demo) return;
    try {
      const saved = await api.addBet(payload);
      setLog((l) => l.map((b) => (b.id === tempId ? saved : b)));
    } catch (e) {
      setLog((l) => l.filter((b) => b.id !== tempId));
      setRegistered((r) => { const n = { ...r }; delete n[o.id]; return n; });
      alert("No se pudo guardar la apuesta. " + e);
    }
  };

  const toggleParlay = (id: string) =>
    setParlayIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const addParlay = async () => {
    if (pLegs.length < 2) return;
    const tempId = uid("p");
    const now = new Date().toISOString();
    const payload = { league: null, pick: pLegs.map((o) => o.pick).join(" + "), odds: Number(par.oddsComb.toFixed(2)), stake: Math.round(par.stake), kind: "parlay" as const, fair_prob: Number(par.probComb.toFixed(5)), tier: null, market: "parlay", sport: null, opportunity_id: null };
    setLog((l) => [{ id: tempId, placed_at: now, ...payload, result: "pending", created_at: now }, ...l]);
    setParlayIds([]);
    if (demo) return;
    try {
      const saved = await api.addBet(payload);
      setLog((l) => l.map((b) => (b.id === tempId ? saved : b)));
    } catch (e) {
      setLog((l) => l.filter((b) => b.id !== tempId));
      alert("No se pudo guardar el parlay. " + e);
    }
  };

  const addManual = async () => {
    const od = parseFloat(mForm.odds), st = parseFloat(mForm.stake);
    if (!mForm.pick.trim() || !(od > 1) || !(st > 0)) return;
    const tempId = uid("m");
    const now = new Date().toISOString();
    const payload = { league: null, pick: mForm.pick.trim(), odds: od, stake: Math.round(st), kind: "manual" as const, fair_prob: null, tier: null, market: null, sport: null, opportunity_id: null };
    setLog((l) => [{ id: tempId, placed_at: now, ...payload, result: "pending", created_at: now }, ...l]);
    setMForm({ pick: "", odds: "", stake: "" });
    if (demo) return;
    try {
      const saved = await api.addBet(payload);
      setLog((l) => l.map((b) => (b.id === tempId ? saved : b)));
    } catch (e) {
      setLog((l) => l.filter((b) => b.id !== tempId));
      alert("No se pudo guardar la apuesta. " + e);
    }
  };

  const settle = async (id: string, result: BetResult) => {
    const prev = log;
    setLog((l) => l.map((b) => (b.id === id ? { ...b, result } : b)));
    if (demo) return;
    try { await api.settleBet(id, result); }
    catch (e) { setLog(prev); alert("No se pudo actualizar el resultado. " + e); }
  };

  const delBet = async (id: string) => {
    const prev = log;
    setLog((l) => l.filter((b) => b.id !== id));
    if (demo) return;
    try { await api.deleteBet(id); }
    catch (e) { setLog(prev); alert("No se pudo borrar la apuesta. " + e); }
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // Escaneo bajo demanda (botón "Escanear ahora")
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const rescan = async () => {
    if (demo) { startRefresh(() => router.refresh()); return; }
    setScanning(true); setScanMsg(null);
    try {
      const r = await fetch("/api/rescan", { method: "POST" });
      const j = await r.json();
      if (j.throttled) setScanMsg(j.message);
      else if (j.error) setScanMsg("Error: " + j.error);
      else {
        setScanMsg(`✓ ${j.total} oportunidades · ${j.credits_remaining ?? "?"} créditos restantes`);
        startRefresh(() => router.refresh());
      }
    } catch (e) {
      setScanMsg("No se pudo escanear: " + e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="sv-root">
      <div className="sv-wrap">
        <header className="sv-head">
          <div className="sv-brand">
            <h1 className="disp">Scanner de Valor</h1>
            <div className="sub">recomendaciones por <b>confianza</b> · parlays · registro
              {demo ? <span className="demo-tag">datos demo</span> : <span className="demo-tag live">en vivo</span>}
            </div>
          </div>
          <div className="sv-status">
            <div className="pill"><Clock size={13} />escaneado <b className="mono">{demo ? "demo" : fmtAgo(lastScan)}</b></div>
            <button className="refresh-btn" onClick={rescan} disabled={scanning || isRefreshing}>
              <RefreshCw size={13} className={scanning || isRefreshing ? "spin" : ""} /> {scanning ? "Escaneando…" : "Escanear ahora"}
            </button>
            <Link href="/estudio" className="refresh-btn"><TrendingUp size={13} /> El estudio</Link>
            {gated && <button className="logout-link" onClick={logout}>salir</button>}
            {scanMsg && <div className="scan-msg">{scanMsg}</div>}
          </div>
        </header>

        <div className="sv-grid">
          {/* RAIL */}
          <aside className="rail">
            <div className="card card-pad">
              <div className="card-h"><Wallet size={13} /> Mi banca</div>
              <div className="bk-row"><span className="cur">$</span>
                <input className="bk-edit" type="number" value={startBank}
                  onChange={(e) => setStartBank(Math.max(0, Number(e.target.value) || 0))} aria-label="Banca inicial" />
              </div>
              <div className="bk-now">
                <span className="l">Banca actual <span className="tag">auto</span></span>
                <span className={"v " + (settledPL >= 0 ? "up" : "down")}>{fmt(currentBank)}</span>
              </div>
              <div className="field">
                <div className="field-lab">Tope por apuesta<span className="v">{unitPct}%</span></div>
                <input type="range" min="1" max="5" step="0.5" value={unitPct} onChange={(e) => setUnitPct(Number(e.target.value))} />
              </div>
              <div className="field">
                <div className="field-lab">Fracción de Kelly<span className="v">agresividad</span></div>
                <div className="seg">{([["¼", 0.25], ["½", 0.5], ["1", 1]] as const).map(([t, v]) => (
                  <button key={v} data-on={kellyFrac === v ? 1 : 0} onClick={() => setKellyFrac(v)}>{t}</button>))}</div>
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <div className={"risk" + (stopped ? " warn" : "")}>
                  <ShieldCheck className="ic" size={18} />
                  <div><div className="t">{stopped ? "Stop-loss activado" : "Stop-loss activo"}</div>
                    <div className="s">semana {weekPL >= 0 ? "+" : ""}{weekPL.toFixed(1)}% · límite {stopLossPct}%</div></div>
                </div>
              </div>
            </div>
            <div className="card card-pad">
              <div className="card-h"><TrendingUp size={13} /> Resultados reales</div>
              <div className="stat-row"><span className="k">ROI</span><span className={"vv " + (roi >= 0 ? "up" : "down")}>{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</span></div>
              <div className="stat-row"><span className="k">Ganancia neta</span><span className={"vv " + (settledPL >= 0 ? "up" : "down")}>{settledPL >= 0 ? "+" : ""}{fmt(settledPL)}</span></div>
              <div className="stat-row"><span className="k">Récord (G–P)</span><span className="vv">{wins}–{losses}</span></div>
              <div className="stat-row"><span className="k">Total apostado</span><span className="vv" style={{ color: "var(--dim)" }}>{fmt(totalStaked)}</span></div>
            </div>
          </aside>

          {/* MAIN */}
          <main>
            {dbError && (
              <div className="stop-banner" style={{ marginBottom: 16 }}>
                <Info size={18} />
                <div>
                  <div className="t">Sin conexión a la base de datos</div>
                  <div className="s">No pude leer tus datos reales — estás viendo <b>datos de demostración</b>. Revisa las llaves de Supabase o vuelve a intentar con <b>Actualizar</b>. Lo que registres ahora <b>no se guardará</b>.</div>
                </div>
              </div>
            )}
            <div className="filterbar">
              <div className="chips">{SPORTS.map((s) => (
                <button key={s.id} className="chip" data-on={sports[s.id] ? 1 : 0} onClick={() => setSports((p) => ({ ...p, [s.id]: !p[s.id] }))}>{s.label}</button>))}</div>
              <div className="conf-filter">confianza mínima <span className="vv">{minConf}★</span>
                <input type="range" min="1" max="5" step="1" value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} /></div>
            </div>

            {stopped && (
              <div className="stop-banner">
                <ShieldCheck size={18} />
                <div>
                  <div className="t">Stop-loss activado — pausa esta semana</div>
                  <div className="s">Cruzaste tu límite ({stopLossPct}%, vas {weekPL >= 0 ? "+" : ""}{weekPL.toFixed(1)}%). El registro de recomendaciones y parlays está en pausa. <b>No persigas pérdidas</b> — se reactiva cuando tu semana se recupere.</div>
                </div>
              </div>
            )}

            <div className="method">
              <div role="button" tabIndex={0} aria-expanded={showMethod}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontWeight: 600 }}
                onClick={() => setShowMethod((v) => !v)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setShowMethod((v) => !v))}>
                <Info size={14} style={{ color: "var(--gold)" }} /> ¿Qué significa la confianza?
                <ChevronDown size={14} className="chev" style={{ marginLeft: "auto", transform: showMethod ? "rotate(180deg)" : "none" }} />
              </div>
              {showMethod && (<div style={{ marginTop: 10 }}>
                La <b>confianza (1–5)</b> mide la <b>fuerza de la jugada</b>, no que vaya a ganar. Sale del tamaño del valor
                (<code>EV = prob × momio − 1</code>) ajustado por la probabilidad de acierto: los longshots se capan a 3★ por su
                varianza. <b>Un 5★ también pierde seguido</b> — es normal. El <b>monto sugerido</b> viene de <code>Kelly fraccionado</code>
                sobre tu banca actual, topado a tu unidad. La IA redacta contexto; <b>no predice resultados</b>.
              </div>)}
            </div>

            {/* PESTAÑAS POR DÍA */}
            <div className="day-tabs">
              {(["hoy", "manana", "futuro"] as const).map((d) => (
                <button key={d} className="day-tab" data-on={dayTab === d ? 1 : 0} onClick={() => setDayTab(d)}>
                  {dayLabel[d]} <span className="day-count">{countByDay(d)}</span>
                </button>
              ))}
            </div>

            {newCount > 0 && (
              <div className="new-strip">
                <span className="new-dot" /> {newCount} oportunidad{newCount > 1 ? "es" : ""} nueva{newCount > 1 ? "s" : ""} desde el último escaneo — marcadas con <span className="pd-tag" style={{ marginLeft: 4 }}>NUEVA</span>
              </div>
            )}

            <div className="card-h" style={{ fontSize: 11, marginBottom: 13 }}><Activity size={13} /> Top 3 del día · {dayLabel[dayTab]}{recs.length > 0 ? ` — ${Math.min(3, recs.length)} de ${recs.length}` : ""}</div>

            {recs.length === 0 && <div className="empty">Sin recomendaciones para {dayLabel[dayTab].toLowerCase()} a este nivel de confianza. Cambiá de día, bajá el filtro, o esperá el próximo escaneo — no apostar es una jugada válida.</div>}

            {topRecs.map((o) => (
              <RecCard key={o.id} o={o} units={toUnits(o.stake)} inParlay={parlayIds.includes(o.id)}
                registered={!!registered[o.id]} blocked={stopped} onAdd={() => addBet(o)} onParlay={() => toggleParlay(o.id)}
                playdoit={playdoitOdds[o.id] ?? ""} onPlaydoit={(v) => setPlaydoit(o.id, v)} />
            ))}

            {restRecs.length > 0 && (
              <>
                <div className="novalue-head" tabIndex={0} role="button" onClick={() => setShowAllRecs((v) => !v)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowAllRecs((v) => !v)}>
                  <ChevronDown size={14} className="chev" style={{ transform: showAllRecs ? "rotate(180deg)" : "none" }} />
                  Ver las demás con valor ({restRecs.length})
                </div>
                {showAllRecs && restRecs.map((o) => (
                  <RecCard key={o.id} o={o} units={toUnits(o.stake)} inParlay={parlayIds.includes(o.id)}
                    registered={!!registered[o.id]} blocked={stopped} onAdd={() => addBet(o)} onParlay={() => toggleParlay(o.id)}
                    playdoit={playdoitOdds[o.id] ?? ""} onPlaydoit={(v) => setPlaydoit(o.id, v)} />
                ))}
              </>
            )}

            {/* AUTO PARLAYS — del día seleccionado */}
            <AutoParlays
              opportunities={vigentes.filter((o) => dayOf(o) === dayTab)}
              currentBank={currentBank}
              kellyFrac={kellyFrac}
              unitPct={unitPct}
              blocked={stopped}
              onRegister={async (pick, odds, stake, fairProb) => {
                const tempId = uid("ap");
                const now = new Date().toISOString();
                const payload = { league: null, pick, odds, stake, kind: "parlay" as const, fair_prob: fairProb, tier: null, market: "parlay", sport: null, opportunity_id: null };
                setLog((l) => [{ id: tempId, placed_at: now, ...payload, result: "pending", created_at: now }, ...l]);
                if (demo) return;
                try { const saved = await api.addBet(payload); setLog((l) => l.map((b) => (b.id === tempId ? saved : b))); }
                catch (e) { setLog((l) => l.filter((b) => b.id !== tempId)); alert("No se pudo guardar. " + e); }
              }}
            />

            {/* PARLAY BUILDER */}
            {pLegs.length > 0 && (
              <div className="parlay">
                <div className="card-h" style={{ marginBottom: 4, color: "var(--gold)" }}><Layers size={13} /> Constructor de parlay — {pLegs.length} selección{pLegs.length > 1 ? "es" : ""}</div>
                <div className="parlay-legs">
                  {pLegs.map((o) => (
                    <div className="pleg" key={o.id}>
                      <span className="pk"><b>{o.pick}</b> · {o.match}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="od">{o.effOdds.toFixed(2)}{o.playdoit ? <span className="pd-tag">PD</span> : null}</span>
                        <span className="x" onClick={() => toggleParlay(o.id)}><Trash2 size={14} /></span>
                      </span>
                    </div>
                  ))}
                </div>
                {pLegs.length >= 2 ? (
                  <>
                    <div className="parlay-foot">
                      <div className="pf"><div className="l">Momio combinado</div><div className="v">{par.oddsComb.toFixed(2)}<span style={{ color: "var(--faint)", fontSize: 11, marginLeft: 4 }}>{decToAmerican(par.oddsComb)}</span></div></div>
                      <div className="pf"><div className="l">Prob. combinada</div><div className="v">{(par.probComb * 100).toFixed(1)}%</div></div>
                      <div className="pf"><div className="l">Valor (EV)</div><div className="v" style={{ color: par.ev >= 0 ? "var(--pos)" : "var(--neg)" }}>{par.ev >= 0 ? "+" : ""}{(par.ev * 100).toFixed(1)}%</div></div>
                      <div className="pf"><div className="l">Apostar · pago</div><div className="v big">{fmt(par.stake)}<span style={{ color: "var(--dim)", fontSize: 12, fontFamily: "IBM Plex Mono" }}> → {fmt(par.stake * par.oddsComb)}</span></div></div>
                    </div>
                    <div className="parlay-warn"><Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      El parlay multiplica el valor <b>y</b> la varianza: necesitás que <b>todas</b> las patas tengan valor real. El monto va topado a {(unitPct * 0.4).toFixed(1)}% de la banca. Patas del mismo partido están correlacionadas (este cálculo asume independencia).</div>
                    <button className="btn go" style={{ marginTop: 12 }} onClick={addParlay}><Plus size={14} /> Registrar parlay</button>
                  </>
                ) : <div style={{ fontSize: 12, color: "var(--dim)" }}>Agregá al menos 2 selecciones para armar el parlay.</div>}
              </div>
            )}

            {noVal.length > 0 && (
              <>
                <div className="novalue-head" tabIndex={0} role="button" onClick={() => setShowNoValue((v) => !v)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowNoValue((v) => !v)}>
                  <ChevronDown size={14} className="chev" style={{ transform: showNoValue ? "rotate(180deg)" : "none" }} />
                  No recomendadas ({noVal.length}) — el momio no compensa
                </div>
                {showNoValue && noVal.map((o) => (
                  <RecCard key={o.id} o={o} units={toUnits(o.stake)} muted inParlay={false} registered onAdd={() => {}} onParlay={() => {}} playdoit="" onPlaydoit={() => {}} />))}
              </>
            )}

            {/* EXPIRADAS — el valor se fue; no se borran en silencio */}
            {expiradas.length > 0 && (
              <>
                <div className="novalue-head" tabIndex={0} role="button" onClick={() => setShowExpired((v) => !v)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowExpired((v) => !v)}>
                  <ChevronDown size={14} className="chev" style={{ transform: showExpired ? "rotate(180deg)" : "none" }} />
                  Expiradas ({expiradas.length}) — el valor se fue desde que aparecieron
                </div>
                {showExpired && expiradas.map((o) => (
                  <RecCard key={o.id} o={o} units={toUnits(o.stake)} muted inParlay={false} registered onAdd={() => {}} onParlay={() => {}} playdoit="" onPlaydoit={() => {}} />))}
              </>
            )}

            {/* AGREGAR MANUAL */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-pad">
                <div className="card-h"><PencilLine size={13} /> Registrar una apuesta mía</div>
                <div className="mform">
                  <div className="inp"><label>Selección</label><input value={mForm.pick} placeholder="Ej. América ML"
                    onChange={(e) => setMForm((f) => ({ ...f, pick: e.target.value }))} /></div>
                  <div className="inp"><label>Momio (dec.)</label><input value={mForm.odds} placeholder="2.10" inputMode="decimal"
                    onChange={(e) => setMForm((f) => ({ ...f, odds: e.target.value }))} /></div>
                  <div className="inp"><label>Monto $</label><input value={mForm.stake} placeholder="300" inputMode="numeric"
                    onChange={(e) => setMForm((f) => ({ ...f, stake: e.target.value }))} /></div>
                  <button className="btn go" onClick={addManual}><Plus size={14} /> Agregar</button>
                </div>
              </div>
            </div>

            {/* BITÁCORA */}
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-pad" style={{ paddingBottom: 4 }}>
                <div className="card-h" style={{ marginBottom: 4 }}><Clock size={13} /> Bitácora — registro honesto (incluye pérdidas)</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead><tr><th>Fecha</th><th>Selección</th><th>Momio</th><th>Monto</th><th>Resultado</th><th>P&L</th><th></th></tr></thead>
                  <tbody>
                    {log.map((b) => {
                      const p = betPL(b); const cls = b.result === "win" ? "win" : b.result === "loss" ? "loss" : "flat";
                      const lc = (b.league && LEAGUE_COLOR[b.league]) || "var(--dim)";
                      const syncing = !demo && !isUuid(b.id); // aún no confirmada por la DB
                      return (
                        <tr key={b.id}>
                          <td className="mono" style={{ color: "var(--dim)", whiteSpace: "nowrap" }}>{fmtDate(b.placed_at)}</td>
                          <td><span style={{ color: "var(--text)" }}>{b.pick}</span>
                            {b.kind === "parlay" && <span className="tag" style={{ color: "var(--gold)" }}>PARLAY</span>}
                            {b.kind === "manual" && <span className="tag">MANUAL</span>}
                            {b.kind === "single" && b.league && <span className="tag" style={{ color: lc }}>{b.league}</span>}</td>
                          <td className="mono">{b.odds.toFixed(2)}</td>
                          <td className="mono">{fmt(b.stake)}</td>
                          <td>{b.result === "pending" ? (
                            syncing ? (
                              <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>guardando…</span>
                            ) : (
                            <div className="settle">
                              <button className="sbtn w" onClick={() => settle(b.id, "win")}>Ganó</button>
                              <button className="sbtn l" onClick={() => settle(b.id, "loss")}>Perdió</button>
                              <button className="sbtn" onClick={() => settle(b.id, "push")}>Push</button>
                            </div>
                            )
                          ) : (
                            <span className={"res " + (b.result === "push" ? "push" : b.result)}>
                              {b.result === "win" && <CircleCheck size={12} />}{b.result === "loss" && <CircleX size={12} />}
                              {b.result === "win" ? "Ganada" : b.result === "loss" ? "Perdida" : "Push"}
                            </span>)}</td>
                          <td className={"mono profit " + cls}>{b.result === "pending" ? "—" : (p >= 0 ? "+" : "") + fmt(p)}</td>
                          <td>{!syncing && <span style={{ cursor: "pointer", color: "var(--faint)", display: "flex" }} onClick={() => delBet(b.id)}><Trash2 size={13} /></span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="foot"><Info className="ic" size={16} />
              <p><b>Herramienta de decisión, no una garantía.</b> La confianza mide la calidad del valor, no que la apuesta entre;
                aun los 5★ pierden por <b>varianza</b>. {demo ? <>Los momios y la prob. justa son simulados (datos de demostración).</> : <>El valor se mide contra la línea sharp de Pinnacle; confirma el precio real en Playdoit antes de apostar.</>}
                Recordá que Playdoit <b>limita las cuentas ganadoras</b>. El margen positivo solo aparece con volumen, disciplina y banca bien gestionada.</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
