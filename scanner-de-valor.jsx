import React, { useState, useEffect, useMemo } from "react";
import {
  Activity, RefreshCw, TrendingUp, ShieldCheck, Wallet, Plus, ChevronDown,
  Info, CircleCheck, CircleX, Clock, Layers, Star, Trash2, PencilLine,
} from "lucide-react";

/* ============================================================
   SCANNER DE VALOR — v2 (datos de demostración)
   Recomendaciones por confianza (1–5) · parlays · registro
   Guarda bankroll y bitácora · recalcula tu banca en automático
   Matemática (EV, Kelly, confianza, parlay): real. Momios: simulados.
   ============================================================ */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.sv-root{
  --bg:#0d1117; --surface:#161d27; --surface-2:#1c2530; --surface-3:#212c39;
  --line:#2a3542; --line-soft:#222c38;
  --text:#e6edf3; --dim:#8a97a6; --faint:#586472;
  --pos:#34d399; --pos-soft:rgba(52,211,153,.12); --pos-line:rgba(52,211,153,.30);
  --neg:#f0664f; --neg-soft:rgba(240,102,79,.10); --neg-line:rgba(240,102,79,.28);
  --gold:#e0a23b; --gold-soft:rgba(224,162,59,.13); --gold-line:rgba(224,162,59,.32);
  --blue:#5b9bd5;
  background:radial-gradient(1100px 520px at 80% -10%,rgba(52,211,153,.06),transparent 60%),
    radial-gradient(900px 480px at 0% 0%,rgba(224,162,59,.05),transparent 55%),var(--bg);
  color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;
}
.sv-root *{box-sizing:border-box;}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;}
.disp{font-family:'Space Grotesk',sans-serif;}
.sv-wrap{max-width:1180px;margin:0 auto;padding:22px 20px 60px;}

.sv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:20px;}
.sv-brand h1{font-family:'Space Grotesk';font-weight:700;font-size:23px;letter-spacing:-.4px;margin:0;line-height:1.05;}
.sv-brand .sub{color:var(--dim);font-size:12.5px;margin-top:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.sv-brand .sub b{color:var(--text);font-weight:600;}
.demo-tag{font-family:'IBM Plex Mono';font-size:10px;letter-spacing:.12em;color:var(--gold);
  border:1px solid var(--gold-line);background:var(--gold-soft);padding:2px 7px;border-radius:5px;text-transform:uppercase;}
.sv-status{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.pill{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--line);
  border-radius:9px;padding:8px 12px;font-size:12px;color:var(--dim);}
.pill .dot{width:7px;height:7px;border-radius:50%;background:var(--pos);box-shadow:0 0 0 3px var(--pos-soft);}
.pill b{color:var(--text);font-weight:600;}
.refresh-btn{display:flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--line);
  color:var(--text);border-radius:9px;padding:8px 12px;font-size:12px;cursor:pointer;font-family:'Inter';transition:.15s;}
.refresh-btn:hover{border-color:var(--gold-line);background:var(--surface-2);}
.refresh-btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}

.sv-grid{display:grid;grid-template-columns:250px 1fr;gap:16px;align-items:start;}
@media(max-width:880px){.sv-grid{grid-template-columns:1fr;}}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;}
.card-pad{padding:16px;}
.card-h{font-family:'IBM Plex Mono';font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);
  display:flex;align-items:center;gap:7px;margin-bottom:14px;}
.card-h svg{color:var(--dim);}

.rail{display:flex;flex-direction:column;gap:13px;position:sticky;top:14px;}
@media(max-width:880px){.rail{position:static;}}
.bk-row{display:flex;align-items:baseline;gap:6px;}
.bk-row .cur{color:var(--dim);font-size:16px;font-family:'IBM Plex Mono';}
.bk-edit{background:transparent;border:none;color:var(--text);font-family:'Space Grotesk';font-weight:600;
  font-size:29px;width:100%;padding:0;letter-spacing:-.5px;}
.bk-edit:focus{outline:none;}
.bk-now{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding:10px 12px;
  border-radius:10px;background:var(--surface-2);border:1px solid var(--line-soft);}
.bk-now .l{font-size:11px;color:var(--dim);}
.bk-now .v{font-family:'IBM Plex Mono';font-weight:600;font-size:15px;}
.field{margin-top:14px;}
.field-lab{font-size:11px;color:var(--dim);margin-bottom:7px;display:flex;justify-content:space-between;}
.field-lab .v{color:var(--text);font-family:'IBM Plex Mono';font-weight:600;}
.seg{display:flex;gap:5px;}
.seg button{flex:1;background:var(--surface-2);border:1px solid var(--line);color:var(--dim);border-radius:8px;
  padding:6px 0;font-size:12px;font-family:'IBM Plex Mono';cursor:pointer;transition:.13s;}
.seg button:hover{color:var(--text);}
.seg button[data-on="1"]{background:var(--gold-soft);border-color:var(--gold-line);color:var(--gold);}
.seg button:focus-visible{outline:2px solid var(--gold);outline-offset:1px;}
input[type=range]{width:100%;accent-color:var(--gold);height:4px;cursor:pointer;}
.risk{display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:10px;border:1px solid var(--pos-line);background:var(--pos-soft);}
.risk.warn{border-color:var(--neg-line);background:var(--neg-soft);}
.risk .ic{color:var(--pos);} .risk.warn .ic{color:var(--neg);}
.risk .t{font-size:12px;font-weight:600;} .risk .s{font-size:11px;color:var(--dim);font-family:'IBM Plex Mono';}
.stat-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--line-soft);}
.stat-row:last-child{border-bottom:none;}
.stat-row .k{font-size:12px;color:var(--dim);} .stat-row .vv{font-family:'IBM Plex Mono';font-size:13px;font-weight:600;}
.up{color:var(--pos);} .down{color:var(--neg);}

.filterbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between;margin-bottom:14px;}
.chips{display:flex;gap:6px;flex-wrap:wrap;}
.chip{font-size:11.5px;font-family:'IBM Plex Mono';padding:5px 10px;border-radius:20px;border:1px solid var(--line);
  background:var(--surface-2);color:var(--dim);cursor:pointer;transition:.13s;}
.chip[data-on="1"]{background:var(--surface-3);color:var(--text);} .chip[data-on="0"]{opacity:.45;}
.chip:hover{color:var(--text);} .chip:focus-visible{outline:2px solid var(--gold);outline-offset:1px;}
.conf-filter{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--dim);white-space:nowrap;}
.conf-filter .vv{font-family:'IBM Plex Mono';color:var(--gold);font-weight:600;}
.conf-filter input[type=range]{width:110px;}

.method{font-size:11.5px;color:var(--dim);line-height:1.6;background:var(--surface-2);border:1px solid var(--line-soft);
  border-radius:11px;padding:13px 15px;margin-bottom:16px;}
.method b{color:var(--text);font-weight:600;}
.method code{font-family:'IBM Plex Mono';background:var(--surface-3);padding:1px 6px;border-radius:5px;font-size:11px;color:var(--gold);}
.method .chev{margin-left:auto;transition:transform .2s;}

/* recommendation card */
.rec{border:1px solid var(--line);border-radius:13px;background:var(--surface);padding:15px 16px;margin-bottom:11px;
  position:relative;overflow:hidden;}
.rec.muted{opacity:.6;border-style:dashed;}
.rec-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px;}
.rec-tl{display:flex;align-items:center;gap:12px;}
.league{font-size:10px;font-family:'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:6px;font-weight:600;}
.mkt{font-size:11px;color:var(--dim);font-family:'IBM Plex Mono';}

/* confidence meter */
.conf{display:flex;align-items:center;gap:9px;}
.conf-pips{display:flex;gap:3px;}
.conf-pip{width:9px;height:16px;border-radius:3px;background:var(--surface-3);}
.conf-badge{font-family:'Space Grotesk';font-weight:700;font-size:15px;width:24px;height:24px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;}
.conf-label{font-size:10px;font-family:'IBM Plex Mono';color:var(--faint);text-transform:uppercase;letter-spacing:.08em;}

.matchup{font-family:'Space Grotesk';font-weight:600;font-size:17px;letter-spacing:-.2px;margin-top:2px;}
.pickline{font-size:13.5px;color:var(--dim);margin-top:4px;}
.pickline b{color:var(--text);font-weight:600;}
.pickline .od{font-family:'IBM Plex Mono';color:var(--text);font-weight:600;}
.pickline .am{font-family:'IBM Plex Mono';color:var(--faint);font-size:11px;margin-left:3px;}

.rec-stats{display:flex;gap:18px;margin-top:12px;}
.rs{font-size:11px;color:var(--dim);}
.rs .n{font-family:'IBM Plex Mono';font-weight:600;color:var(--text);font-size:13px;}
.rs .n.pos{color:var(--pos);}

.stake-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:13px;border-top:1px solid var(--line-soft);flex-wrap:wrap;}
.stake-info .lab{font-size:9.5px;font-family:'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--faint);}
.stake-info .amt{font-family:'Space Grotesk';font-weight:600;font-size:21px;letter-spacing:-.3px;}
.stake-info .amt .c{color:var(--dim);font-size:13px;font-family:'IBM Plex Mono';}
.stake-info .meta{font-size:10.5px;color:var(--faint);font-family:'IBM Plex Mono';margin-top:2px;}
.rec-actions{display:flex;gap:8px;}
.btn{display:flex;align-items:center;gap:7px;border-radius:9px;padding:9px 13px;font-size:12.5px;font-weight:600;
  cursor:pointer;font-family:'Inter';transition:.14s;border:1px solid var(--line);background:var(--surface-2);color:var(--text);}
.btn:hover{background:var(--surface-3);}
.btn:focus-visible{outline:2px solid var(--gold);outline-offset:2px;}
.btn.go{background:var(--pos-soft);border-color:var(--pos-line);color:var(--pos);}
.btn.go:hover{background:rgba(52,211,153,.2);}
.btn.go.done{background:var(--surface-2);border-color:var(--line);color:var(--dim);cursor:default;}
.btn.par[data-on="1"]{background:var(--gold-soft);border-color:var(--gold-line);color:var(--gold);}

.novalue-head{display:flex;align-items:center;gap:9px;cursor:pointer;color:var(--dim);font-size:12px;
  font-family:'IBM Plex Mono';margin:18px 0 10px;user-select:none;}
.novalue-head:focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:4px;}
.novalue-head .chev{transition:transform .2s;}

/* parlay panel */
.parlay{border:1px solid var(--gold-line);background:linear-gradient(180deg,var(--gold-soft),transparent);border-radius:14px;padding:16px;margin-bottom:18px;}
.parlay-legs{display:flex;flex-direction:column;gap:8px;margin:12px 0;}
.pleg{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface);border:1px solid var(--line);
  border-radius:9px;padding:9px 11px;font-size:12.5px;}
.pleg .pk b{color:var(--text);} .pleg .pk{color:var(--dim);}
.pleg .od{font-family:'IBM Plex Mono';font-weight:600;}
.pleg .x{cursor:pointer;color:var(--faint);display:flex;}
.pleg .x:hover{color:var(--neg);}
.parlay-foot{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:end;margin-top:14px;padding-top:13px;border-top:1px solid var(--gold-line);}
@media(max-width:560px){.parlay-foot{grid-template-columns:1fr 1fr;}}
.pf .l{font-size:9.5px;font-family:'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:4px;}
.pf .v{font-family:'IBM Plex Mono';font-weight:700;font-size:17px;}
.pf .v.big{font-family:'Space Grotesk';font-size:20px;}
.parlay-warn{font-size:11px;color:var(--gold);background:var(--gold-soft);border:1px solid var(--gold-line);border-radius:8px;
  padding:8px 11px;margin-top:12px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;}

/* manual form */
.mform{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:9px;align-items:end;}
@media(max-width:620px){.mform{grid-template-columns:1fr 1fr;}}
.inp{display:flex;flex-direction:column;gap:5px;}
.inp label{font-size:10px;font-family:'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:var(--faint);}
.inp input{background:var(--surface-2);border:1px solid var(--line);border-radius:8px;color:var(--text);
  padding:9px 11px;font-size:13px;font-family:'IBM Plex Mono';}
.inp input:focus{outline:none;border-color:var(--gold-line);}

/* bitacora */
.tbl{width:100%;border-collapse:collapse;}
.tbl th{font-size:9.5px;font-family:'IBM Plex Mono';letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);font-weight:500;}
.tbl td{padding:10px;border-bottom:1px solid var(--line-soft);font-size:12.5px;vertical-align:middle;}
.tbl td.mono{font-family:'IBM Plex Mono';}
.tbl tr:last-child td{border-bottom:none;}
.res{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-family:'IBM Plex Mono';font-weight:600;padding:3px 8px;border-radius:6px;}
.res.win{color:var(--pos);background:var(--pos-soft);} .res.loss{color:var(--neg);background:var(--neg-soft);}
.res.pend{color:var(--gold);background:var(--gold-soft);} .res.push{color:var(--dim);background:var(--surface-3);}
.profit.win{color:var(--pos);} .profit.loss{color:var(--neg);} .profit.flat{color:var(--faint);}
.settle{display:flex;gap:5px;}
.sbtn{font-size:10px;font-family:'IBM Plex Mono';border:1px solid var(--line);background:var(--surface-2);color:var(--dim);
  border-radius:6px;padding:4px 7px;cursor:pointer;transition:.12s;}
.sbtn:hover{color:var(--text);border-color:var(--gold-line);}
.sbtn.w:hover{color:var(--pos);border-color:var(--pos-line);}
.sbtn.l:hover{color:var(--neg);border-color:var(--neg-line);}
.tag{font-size:9px;font-family:'IBM Plex Mono';padding:2px 5px;border-radius:4px;background:var(--surface-3);color:var(--dim);margin-left:6px;letter-spacing:.05em;}

.foot{margin-top:26px;border:1px solid var(--line-soft);background:var(--surface);border-radius:12px;padding:14px 16px;display:flex;gap:11px;align-items:flex-start;}
.foot .ic{color:var(--gold);flex-shrink:0;margin-top:1px;} .foot p{margin:0;font-size:11.5px;color:var(--dim);line-height:1.6;} .foot b{color:var(--text);font-weight:600;}
.empty{text-align:center;padding:26px 18px;color:var(--dim);font-size:13px;border:1px dashed var(--line);border-radius:12px;}
@media(prefers-reduced-motion:reduce){*{transition:none!important;}}
`;

/* ---------- matemática real ---------- */
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-MX");
const decToAm = (d) => (d >= 2 ? "+" + Math.round((d - 1) * 100) : "-" + Math.round(100 / (d - 1)));
const evPct = (p, o) => p * o - 1;
const kellyFull = (p, o) => { const b = o - 1; return (b * p - (1 - p)) / b; };

// confianza 1–5: fuerza del valor (EV) modulada por probabilidad/varianza
function confTier(ev, p) {
  const e = ev * 100;
  let t = e >= 6 ? 5 : e >= 4 ? 4 : e >= 2.5 ? 3 : e >= 1 ? 2 : 1;
  if (p < 0.30) t = Math.min(t, 3);   // longshot: alta varianza, capado
  if (p < 0.18) t = Math.min(t, 2);
  if (p >= 0.62 && e >= 2.5) t = Math.min(5, t + 1); // favorito sólido con edge real
  return t;
}
const TIER_COLOR = { 5: "#2fd98a", 4: "#7fd14e", 3: "#e0a23b", 2: "#c47a52", 1: "#6b7684" };
const TIER_WORD = { 5: "Máxima", 4: "Alta", 3: "Media", 2: "Baja", 1: "Marginal" };

const LEAGUE_COLOR = {
  "LIGA MX": "#7bc96f", "CHAMPIONS": "#5b9bd5", "LA LIGA": "#6f9bf0", "MUNDIAL 2026": "#e0a23b",
  "NFL": "#c77b5a", "NBA": "#e08a4e", "MLB": "#5bb3c9", "TENIS": "#b6d957", "UFC": "#d14b5a",
};
const SPORT_OF = { "LIGA MX": "futbol", "CHAMPIONS": "futbol", "LA LIGA": "futbol", "MUNDIAL 2026": "futbol", "NFL": "nfl", "NBA": "nba", "MLB": "otros", "TENIS": "otros", "UFC": "otros" };
const SPORTS = [{ id: "futbol", label: "Fútbol" }, { id: "nfl", label: "NFL" }, { id: "nba", label: "NBA" }, { id: "otros", label: "MLB · Tenis · UFC" }];

// fairProb = consenso vig-free simulado (en producción llega por API)
const OPPS = [
  { id: 1, league: "NBA", mkt: "Spread", match: "Celtics vs. Suns", pick: "Celtics -4.5", odds: 1.60, fairProb: 0.650 },
  { id: 2, league: "CHAMPIONS", mkt: "Hándicap asiático", match: "Real Madrid vs. Arsenal", pick: "Real Madrid -0.5", odds: 1.90, fairProb: 0.550 },
  { id: 3, league: "MLB", mkt: "Run line", match: "Dodgers vs. Padres", pick: "Dodgers -1.5", odds: 2.20, fairProb: 0.475 },
  { id: 4, league: "TENIS", mkt: "Ganador", match: "Alcaraz vs. Sinner", pick: "Alcaraz", odds: 1.85, fairProb: 0.567 },
  { id: 5, league: "NFL", mkt: "Total puntos", match: "Chiefs vs. Bills", pick: "Más de 47.5", odds: 1.95, fairProb: 0.527 },
  { id: 6, league: "LA LIGA", mkt: "Ambos anotan", match: "Barcelona vs. Sevilla", pick: "BTTS Sí", odds: 1.80, fairProb: 0.572 },
  { id: 7, league: "UFC", mkt: "Método", match: "Pereira vs. Ankalaev", pick: "Termina por decisión", odds: 2.30, fairProb: 0.448 },
  { id: 8, league: "LIGA MX", mkt: "Ganador", match: "Rayados vs. Tigres", pick: "Rayados", odds: 2.46, fairProb: 0.414 },
  { id: 9, league: "MUNDIAL 2026", mkt: "Ganador", match: "México vs. Croacia", pick: "México", odds: 3.55, fairProb: 0.295 },
  { id: 10, league: "NBA", mkt: "Total puntos", match: "Nuggets vs. Suns", pick: "Más de 224.5", odds: 1.90, fairProb: 0.520 },
];

const SEED_LOG = [
  { id: "s1", date: "19 jun", league: "CHAMPIONS", pick: "PSG -0.5", odds: 2.05, stake: 300, result: "win", kind: "single" },
  { id: "s2", date: "19 jun", league: "NBA", pick: "Celtics -4.5", odds: 1.91, stake: 300, result: "loss", kind: "single" },
  { id: "s3", date: "18 jun", league: "LIGA MX", pick: "Cruz Azul ML", odds: 2.30, stake: 260, result: "win", kind: "single" },
  { id: "s4", date: "18 jun", league: "MLB", pick: "Yankees ML", odds: 1.74, stake: 350, result: "loss", kind: "single" },
  { id: "s5", date: "18 jun", league: "NFL", pick: "Over 44.5", odds: 1.95, stake: 280, result: "win", kind: "single" },
  { id: "s6", date: "17 jun", league: "TENIS", pick: "Swiatek ML", odds: 1.55, stake: 300, result: "loss", kind: "single" },
  { id: "s7", date: "17 jun", league: "PARLAY", pick: "PSG -0.5 + Over 44.5", odds: 4.00, stake: 150, result: "loss", kind: "parlay" },
  { id: "s8", date: "16 jun", league: "UFC", pick: "Por KO/TKO", odds: 2.40, stake: 220, result: "win", kind: "single" },
  { id: "s9", date: "16 jun", league: "NBA", pick: "Lakers +6.5", odds: 1.91, stake: 280, result: "loss", kind: "single" },
  { id: "s10", date: "15 jun", league: "LIGA MX", pick: "Tigres ML", odds: 2.10, stake: 320, result: "win", kind: "single" },
];

const profitOf = (b) => b.result === "win" ? b.stake * (b.odds - 1) : b.result === "loss" ? -b.stake : 0;
const HAS_STORE = typeof window !== "undefined" && window.storage;

export default function ScannerDeValor() {
  const [loaded, setLoaded] = useState(false);
  const [startBank, setStartBank] = useState(20000);
  const [kellyFrac, setKellyFrac] = useState(0.25);
  const [unitPct, setUnitPct] = useState(3);
  const [minConf, setMinConf] = useState(2);
  const [sports, setSports] = useState({ futbol: true, nfl: true, nba: true, otros: true });
  const [log, setLog] = useState(SEED_LOG);
  const [registered, setRegistered] = useState({});
  const [parlay, setParlay] = useState([]); // ids
  const [showMethod, setShowMethod] = useState(false);
  const [showNoValue, setShowNoValue] = useState(false);
  const [secs, setSecs] = useState(30 * 60);
  const [mForm, setMForm] = useState({ pick: "", odds: "", stake: "" });

  // cargar guardado
  useEffect(() => {
    (async () => {
      if (HAS_STORE) {
        try { const c = await window.storage.get("sv_cfg"); if (c) { const v = JSON.parse(c.value); setStartBank(v.startBank ?? 20000); setKellyFrac(v.kellyFrac ?? 0.25); setUnitPct(v.unitPct ?? 3); } } catch (e) {}
        try { const l = await window.storage.get("sv_log"); if (l) setLog(JSON.parse(l.value)); } catch (e) {}
      }
      setLoaded(true);
    })();
  }, []);
  // guardar config
  useEffect(() => { if (loaded && HAS_STORE) { try { window.storage.set("sv_cfg", JSON.stringify({ startBank, kellyFrac, unitPct })); } catch (e) {} } }, [startBank, kellyFrac, unitPct, loaded]);
  // guardar bitácora
  useEffect(() => { if (loaded && HAS_STORE) { try { window.storage.set("sv_log", JSON.stringify(log)); } catch (e) {} } }, [log, loaded]);
  // countdown
  useEffect(() => { const t = setInterval(() => setSecs((s) => (s <= 1 ? 30 * 60 : s - 1)), 1000); return () => clearInterval(t); }, []);

  const settled = log.filter((b) => b.result !== "pending");
  const settledPL = settled.reduce((s, b) => s + profitOf(b), 0);
  const currentBank = startBank + settledPL;
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const roi = totalStaked ? (settledPL / totalStaked) * 100 : 0;
  const wins = settled.filter((b) => b.result === "win").length;
  const losses = settled.filter((b) => b.result === "loss").length;
  const weekPL = roi; const stopLimit = -10; const stopped = weekPL <= stopLimit;

  const computed = useMemo(() => OPPS.map((o) => {
    const ev = evPct(o.fairProb, o.odds);
    const tier = confTier(ev, o.fairProb);
    const kf = Math.max(0, kellyFull(o.fairProb, o.odds));
    const cap = currentBank * (unitPct / 100);
    const stake = Math.min(currentBank * kellyFrac * kf, cap);
    return { ...o, ev, tier, stake, cap };
  }), [currentBank, kellyFrac, unitPct]);

  const visible = computed.filter((o) => sports[SPORT_OF[o.league]]);
  const recs = visible.filter((o) => o.ev > 0 && o.tier >= minConf).sort((a, b) => b.tier - a.tier || b.ev - a.ev);
  const noVal = visible.filter((o) => o.ev <= 0).sort((a, b) => b.ev - a.ev);

  // parlay calc
  const pLegs = computed.filter((o) => parlay.includes(o.id));
  const pOdds = pLegs.reduce((m, o) => m * o.odds, 1);
  const pProb = pLegs.reduce((m, o) => m * o.fairProb, 1);
  const pEv = pLegs.length >= 2 ? pProb * pOdds - 1 : 0;
  const pKf = Math.max(0, kellyFull(pProb, pOdds));
  const pCap = currentBank * (unitPct / 100) * 0.4; // parlays: tope más chico (varianza)
  const pStake = Math.min(currentBank * kellyFrac * pKf, pCap);

  const unit = currentBank * 0.01;
  const toUnits = (s) => (s / unit).toFixed(1);

  const addBet = (o) => {
    if (registered[o.id]) return;
    setRegistered((r) => ({ ...r, [o.id]: true }));
    setLog((l) => [{ id: "r" + o.id + Date.now(), date: "hoy", league: o.league, pick: o.pick, odds: o.odds, stake: Math.round(o.stake), result: "pending", kind: "single" }, ...l]);
  };
  const toggleParlay = (id) => setParlay((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const addParlay = () => {
    if (pLegs.length < 2) return;
    setLog((l) => [{ id: "p" + Date.now(), date: "hoy", league: "PARLAY", pick: pLegs.map((o) => o.pick).join(" + "), odds: Number(pOdds.toFixed(2)), stake: Math.round(pStake), result: "pending", kind: "parlay" }, ...l]);
    setParlay([]);
  };
  const addManual = () => {
    const od = parseFloat(mForm.odds), st = parseFloat(mForm.stake);
    if (!mForm.pick.trim() || !(od > 1) || !(st > 0)) return;
    setLog((l) => [{ id: "m" + Date.now(), date: "hoy", league: "MANUAL", pick: mForm.pick.trim(), odds: od, stake: Math.round(st), result: "pending", kind: "manual" }, ...l]);
    setMForm({ pick: "", odds: "", stake: "" });
  };
  const settle = (id, result) => setLog((l) => l.map((b) => b.id === id ? { ...b, result } : b));
  const delBet = (id) => setLog((l) => l.filter((b) => b.id !== id));
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="sv-root">
      <style>{STYLES}</style>
      <div className="sv-wrap">
        <header className="sv-head">
          <div className="sv-brand">
            <h1 className="disp">Scanner de Valor</h1>
            <div className="sub">recomendaciones por <b>confianza</b> · parlays · registro<span className="demo-tag">datos demo</span></div>
          </div>
          <div className="sv-status">
            <div className="pill"><span className="dot" />escaneo <b>activo</b></div>
            <div className="pill"><Clock size={13} />próximo <b className="mono">{mmss(secs)}</b></div>
            <button className="refresh-btn" onClick={() => setSecs(30 * 60)}><RefreshCw size={13} /> Escanear ahora</button>
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
                <div className="seg">{[["¼", 0.25], ["½", 0.5], ["1", 1]].map(([t, v]) => (
                  <button key={v} data-on={kellyFrac === v ? 1 : 0} onClick={() => setKellyFrac(v)}>{t}</button>))}</div>
              </div>
              <div className="field" style={{ marginTop: 16 }}>
                <div className={"risk" + (stopped ? " warn" : "")}>
                  <ShieldCheck className="ic" size={18} />
                  <div><div className="t">{stopped ? "Stop-loss activado" : "Stop-loss activo"}</div>
                    <div className="s">semana {weekPL >= 0 ? "+" : ""}{weekPL.toFixed(1)}% · límite {stopLimit}%</div></div>
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
            <div className="filterbar">
              <div className="chips">{SPORTS.map((s) => (
                <button key={s.id} className="chip" data-on={sports[s.id] ? 1 : 0} onClick={() => setSports((p) => ({ ...p, [s.id]: !p[s.id] }))}>{s.label}</button>))}</div>
              <div className="conf-filter">confianza mínima <span className="vv">{minConf}★</span>
                <input type="range" min="1" max="5" step="1" value={minConf} onChange={(e) => setMinConf(Number(e.target.value))} /></div>
            </div>

            <div className="method">
              <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontWeight: 600 }} onClick={() => setShowMethod((v) => !v)}>
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

            <div className="card-h" style={{ fontSize: 11, marginBottom: 13 }}><Activity size={13} /> Recomendaciones de hoy — {recs.length}</div>

            {recs.length === 0 && <div className="empty">Sin recomendaciones a este nivel de confianza. Bajá el filtro o esperá el próximo escaneo — no apostar es una jugada válida.</div>}

            {recs.map((o) => (
              <RecCard key={o.id} o={o} units={toUnits(o.stake)} inParlay={parlay.includes(o.id)}
                registered={!!registered[o.id]} onAdd={() => addBet(o)} onParlay={() => toggleParlay(o.id)} />
            ))}

            {/* PARLAY BUILDER */}
            {pLegs.length > 0 && (
              <div className="parlay">
                <div className="card-h" style={{ marginBottom: 4, color: "var(--gold)" }}><Layers size={13} /> Constructor de parlay — {pLegs.length} selección{pLegs.length > 1 ? "es" : ""}</div>
                <div className="parlay-legs">
                  {pLegs.map((o) => (
                    <div className="pleg" key={o.id}>
                      <span className="pk"><b>{o.pick}</b> · {o.match}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="od">{o.odds.toFixed(2)}</span>
                        <span className="x" onClick={() => toggleParlay(o.id)}><Trash2 size={14} /></span>
                      </span>
                    </div>
                  ))}
                </div>
                {pLegs.length >= 2 ? (
                  <>
                    <div className="parlay-foot">
                      <div className="pf"><div className="l">Momio combinado</div><div className="v">{pOdds.toFixed(2)}<span style={{ color: "var(--faint)", fontSize: 11, marginLeft: 4 }}>{decToAm(pOdds)}</span></div></div>
                      <div className="pf"><div className="l">Prob. combinada</div><div className="v">{(pProb * 100).toFixed(1)}%</div></div>
                      <div className="pf"><div className="l">Valor (EV)</div><div className="v" style={{ color: pEv >= 0 ? "var(--pos)" : "var(--neg)" }}>{pEv >= 0 ? "+" : ""}{(pEv * 100).toFixed(1)}%</div></div>
                      <div className="pf"><div className="l">Apostar · pago</div><div className="v big">{fmt(pStake)}<span style={{ color: "var(--dim)", fontSize: 12, fontFamily: "IBM Plex Mono" }}> → {fmt(pStake * pOdds)}</span></div></div>
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
                  <RecCard key={o.id} o={o} units={toUnits(o.stake)} muted inParlay={false} registered onAdd={() => {}} onParlay={() => {}} />))}
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
                      const p = profitOf(b); const cls = b.result === "win" ? "win" : b.result === "loss" ? "loss" : "flat";
                      const lc = LEAGUE_COLOR[b.league] || "var(--dim)";
                      return (
                        <tr key={b.id}>
                          <td className="mono" style={{ color: "var(--dim)", whiteSpace: "nowrap" }}>{b.date}</td>
                          <td><span style={{ color: "var(--text)" }}>{b.pick}</span>
                            {b.kind === "parlay" && <span className="tag" style={{ color: "var(--gold)" }}>PARLAY</span>}
                            {b.kind === "manual" && <span className="tag">MANUAL</span>}
                            {b.kind === "single" && <span className="tag" style={{ color: lc }}>{b.league}</span>}</td>
                          <td className="mono">{b.odds.toFixed(2)}</td>
                          <td className="mono">{fmt(b.stake)}</td>
                          <td>{b.result === "pending" ? (
                            <div className="settle">
                              <button className="sbtn w" onClick={() => settle(b.id, "win")}>Ganó</button>
                              <button className="sbtn l" onClick={() => settle(b.id, "loss")}>Perdió</button>
                              <button className="sbtn" onClick={() => settle(b.id, "push")}>Push</button>
                            </div>
                          ) : (
                            <span className={"res " + (b.result === "push" ? "push" : b.result)}>
                              {b.result === "win" && <CircleCheck size={12} />}{b.result === "loss" && <CircleX size={12} />}
                              {b.result === "win" ? "Ganada" : b.result === "loss" ? "Perdida" : "Push"}
                            </span>)}</td>
                          <td className={"mono profit " + cls}>{b.result === "pending" ? "—" : (p >= 0 ? "+" : "") + fmt(p)}</td>
                          <td><span className="x" style={{ cursor: "pointer", color: "var(--faint)", display: "flex" }} onClick={() => delBet(b.id)}><Trash2 size={13} /></span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="foot"><Info className="ic" size={16} />
              <p><b>Herramienta de decisión, no una garantía.</b> La confianza mide la calidad del valor, no que la apuesta entre;
                aun los 5★ pierden por <b>varianza</b>. Los momios y la prob. justa son simulados (en producción llegan por API).
                Recordá que Playdoit <b>limita las cuentas ganadoras</b>. El margen positivo solo aparece con volumen, disciplina y banca bien gestionada.</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function RecCard({ o, units, muted, inParlay, registered, onAdd, onParlay }) {
  const tc = TIER_COLOR[o.tier]; const lc = LEAGUE_COLOR[o.league] || "#888";
  return (
    <div className={"rec" + (muted ? " muted" : "")} style={!muted ? { borderColor: tc + "55" } : {}}>
      {!muted && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: tc }} />}
      <div className="rec-top">
        <div className="rec-tl">
          <span className="league" style={{ color: lc, background: lc + "1f", border: "1px solid " + lc + "3a" }}>{o.league}</span>
          <span className="mkt">{o.mkt}</span>
        </div>
        <div className="conf">
          <div style={{ textAlign: "right" }}>
            <div className="conf-label">confianza</div>
          </div>
          <div className="conf-pips">{[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="conf-pip" style={n <= o.tier ? { background: tc } : {}} />))}</div>
          <div className="conf-badge" style={{ background: tc + "22", color: tc, border: "1px solid " + tc + "55" }}>{o.tier}</div>
        </div>
      </div>
      <div className="matchup disp">{o.match}</div>
      <div className="pickline">Pick: <b>{o.pick}</b> &nbsp;·&nbsp; <span className="od">{o.odds.toFixed(2)}</span><span className="am">{decToAm(o.odds)}</span></div>
      <div className="rec-stats">
        <div className="rs">prob. de acierto <span className="n">{(o.fairProb * 100).toFixed(0)}%</span></div>
        <div className="rs">valor <span className={"n " + (o.ev >= 0 ? "pos" : "")}>{o.ev >= 0 ? "+" : ""}{(o.ev * 100).toFixed(1)}%</span></div>
        <div className="rs">nivel <span className="n" style={{ color: TIER_COLOR[o.tier] }}>{TIER_WORD[o.tier]}</span></div>
      </div>
      {!muted && (
        <div className="stake-row">
          <div className="stake-info">
            <div className="lab">Monto sugerido</div>
            <div className="amt"><span className="c">$</span>{Math.round(o.stake).toLocaleString("es-MX")}<span style={{ fontSize: 13, color: "var(--dim)", fontFamily: "IBM Plex Mono", fontWeight: 400 }}> · {units}u</span></div>
            <div className="meta">{o.stake >= o.cap ? "topado a tu unidad" : "Kelly fraccionado"}</div>
          </div>
          <div className="rec-actions">
            <button className="btn par" data-on={inParlay ? 1 : 0} onClick={onParlay}><Layers size={14} /> {inParlay ? "En parlay" : "Parlay"}</button>
            <button className={"btn go" + (registered ? " done" : "")} onClick={onAdd} disabled={registered}>
              {registered ? <><CircleCheck size={14} /> Registrada</> : <><Plus size={14} /> Registrar</>}</button>
          </div>
        </div>
      )}
    </div>
  );
}
