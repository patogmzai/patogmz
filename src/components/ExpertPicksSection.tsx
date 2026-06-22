"use client";
import { useState } from "react";
import { Star, Plus, Trash2, CircleCheck, CircleX, ExternalLink, ShieldCheck } from "lucide-react";
import { decToAmerican } from "@/lib/betting";
import { fmtDate } from "@/lib/format";
import { LEAGUE_COLOR } from "@/lib/ui";
import TweetEmbed from "./TweetEmbed";
import type { ExpertPick, ExpertPickResult } from "@/lib/types";

export type ExpertPickInput = Omit<ExpertPick, "id" | "captured_at">;

interface Props {
  picks: ExpertPick[];
  onAdd: (p: ExpertPickInput) => void;
  onSettle: (id: string, result: ExpertPickResult) => void;
  onDelete: (id: string) => void;
}

function isTwitterUrl(url: string): boolean {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const empty = {
  expert_name: "",
  pick: "",
  match: "",
  league: "",
  odds: "",
  stake_units: "",
  source: "",
  source_url: "",
  published: todayStr(),
};

export default function ExpertPicksSection({ picks, onAdd, onSettle, onDelete }: Props) {
  const [f, setF] = useState({ ...empty });
  const [showForm, setShowForm] = useState(false);

  const settled = picks.filter((p) => p.result === "win" || p.result === "loss");
  const wins = settled.filter((p) => p.result === "win").length;
  const losses = settled.filter((p) => p.result === "loss").length;
  const withData = settled.filter((p) => p.odds && p.stake_units);
  const unitsStaked = withData.reduce((s, p) => s + (p.stake_units ?? 0), 0);
  const unitsPL = withData.reduce(
    (s, p) => s + (p.result === "win" ? (p.stake_units ?? 0) * ((p.odds ?? 1) - 1) : -(p.stake_units ?? 0)),
    0
  );
  const roiU = unitsStaked ? (unitsPL / unitsStaked) * 100 : null;

  const submit = () => {
    const od = f.odds ? parseFloat(f.odds) : null;
    const un = f.stake_units ? parseFloat(f.stake_units) : null;
    if (!f.expert_name.trim() || !f.pick.trim() || !f.source.trim() || !f.source_url.trim()) return;
    if (od !== null && !(od > 1)) return;
    onAdd({
      expert_name: f.expert_name.trim(),
      source: f.source.trim(),
      source_url: f.source_url.trim(),
      published_at: new Date(f.published || todayStr()).toISOString(),
      league: f.league.trim() || null,
      sport: null,
      match: f.match.trim() || null,
      pick: f.pick.trim(),
      odds: od,
      stake_units: un,
      rationale: null,
      verified: true,
      result: "pending",
    });
    setF({ ...empty });
  };

  const autoFetched = picks.filter((p) => !p.verified);
  const manual = picks.filter((p) => p.verified);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-pad">
        <div className="card-h"><Star size={13} /> Picks de apostadores famosos — se buscan automáticamente</div>

        <div className="expert-rec">
          <span>récord registrado <span className="n">{wins}–{losses}</span></span>
          <span>rendimiento {roiU === null ? <span className="n">—</span> : <span className="n" style={{ color: roiU >= 0 ? "var(--pos)" : "var(--neg)" }}>{roiU >= 0 ? "+" : ""}{roiU.toFixed(1)}%</span>} <span style={{ color: "var(--faint)" }}>(en unidades)</span></span>
        </div>

        {picks.length === 0 ? (
          <div className="empty">
            Los picks se buscan automáticamente con cada escaneo. Cuando los cappers publiquen picks, aparecen aquí con el tweet incrustado.
          </div>
        ) : (
          <div className="epicks">
            {/* AUTO-FETCHED PICKS — se encontraron solos */}
            {autoFetched.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
                  encontrados automáticamente ({autoFetched.length})
                </div>
                {autoFetched.map((p) => (
                  <PickCard key={p.id} p={p} onSettle={onSettle} onDelete={onDelete} />
                ))}
              </>
            )}
            {/* MANUAL PICKS */}
            {manual.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: "var(--faint)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 10, marginBottom: 4 }}>
                  registrados por ti ({manual.length})
                </div>
                {manual.map((p) => (
                  <PickCard key={p.id} p={p} onSettle={onSettle} onDelete={onDelete} />
                ))}
              </>
            )}
          </div>
        )}

        {/* FORMULARIO MANUAL (colapsado) */}
        <div style={{ borderTop: "1px solid var(--line-soft)", margin: "16px 0 14px" }} />
        <div className="cappers-toggle" onClick={() => setShowForm((v) => !v)}>
          <Plus size={13} /> {showForm ? "Ocultar" : "Registrar pick manualmente"}
        </div>
        {showForm && (
          <>
            <div className="eform">
              <div className="inp"><label>Apostador</label><input value={f.expert_name} placeholder="Ej. Warren Sharp" onChange={(e) => setF({ ...f, expert_name: e.target.value })} /></div>
              <div className="inp"><label>Liga</label><input value={f.league} placeholder="NFL" onChange={(e) => setF({ ...f, league: e.target.value })} /></div>
              <div className="inp"><label>Partido</label><input value={f.match} placeholder="Chiefs vs. Bills" onChange={(e) => setF({ ...f, match: e.target.value })} /></div>
              <div className="inp"><label>Publicado</label><input type="date" value={f.published} onChange={(e) => setF({ ...f, published: e.target.value })} /></div>
              <div className="inp wide"><label>Pick</label><input value={f.pick} placeholder="Bills +2.5" onChange={(e) => setF({ ...f, pick: e.target.value })} /></div>
              <div className="inp"><label>Momio (opc.)</label><input value={f.odds} placeholder="1.95" inputMode="decimal" onChange={(e) => setF({ ...f, odds: e.target.value })} /></div>
              <div className="inp"><label>Unidades (opc.)</label><input value={f.stake_units} placeholder="2" inputMode="decimal" onChange={(e) => setF({ ...f, stake_units: e.target.value })} /></div>
              <div className="inp"><label>Fuente</label><input value={f.source} placeholder="X / @handle" onChange={(e) => setF({ ...f, source: e.target.value })} /></div>
              <div className="inp wide"><label>URL del tweet / post</label><input value={f.source_url} placeholder="https://x.com/usuario/status/123..." inputMode="url" onChange={(e) => setF({ ...f, source_url: e.target.value })} /></div>
              <button className="btn go" style={{ alignSelf: "end" }} onClick={submit}><Plus size={14} /> Agregar</button>
            </div>
          </>
        )}

        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10, display: "flex", gap: 7, alignItems: "flex-start" }}>
          <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1, color: "var(--gold)" }} />
          Los picks se buscan automáticamente de los perfiles de cappers conocidos. Tweets reales, no inventados. Marca resultados para llevar su récord real.
        </div>
      </div>
    </div>
  );
}

function PickCard({ p, onSettle, onDelete }: { p: ExpertPick; onSettle: (id: string, r: ExpertPickResult) => void; onDelete: (id: string) => void }) {
  const lc = (p.league && LEAGUE_COLOR[p.league]) || "var(--dim)";
  const isTweet = isTwitterUrl(p.source_url);
  return (
    <div className="epick">
      <div className="epick-top">
        <span className="who">
          {p.expert_name}
          <span className={"ver " + (p.verified ? "on" : "off")}>{p.verified ? "manual" : "auto"}</span>
        </span>
        {p.result === "pending" ? (
          <div className="settle">
            <button className="sbtn w" onClick={() => onSettle(p.id, "win")}>Ganó</button>
            <button className="sbtn l" onClick={() => onSettle(p.id, "loss")}>Perdió</button>
            <button className="sbtn" onClick={() => onSettle(p.id, "push")}>Push</button>
          </div>
        ) : (
          <span className={"res " + (p.result === "win" ? "win" : p.result === "loss" ? "loss" : "push")}>
            {p.result === "win" && <CircleCheck size={12} />}
            {p.result === "loss" && <CircleX size={12} />}
            {p.result === "win" ? "Ganó" : p.result === "loss" ? "Perdió" : p.result === "void" ? "Anulado" : "Push"}
          </span>
        )}
      </div>
      <div className="epick-pick">
        {p.league && <span style={{ color: lc, fontFamily: "IBM Plex Mono", fontSize: 11, marginRight: 8 }}>{p.league}</span>}
        <b>{p.pick}</b>
        {p.odds ? (
          <> &nbsp;·&nbsp; <span className="od">{p.odds.toFixed(2)}</span> <span style={{ color: "var(--faint)", fontFamily: "IBM Plex Mono", fontSize: 11 }}>{decToAmerican(p.odds)}</span></>
        ) : null}
        {p.match ? <span style={{ color: "var(--faint)" }}> — {p.match}</span> : null}
        {p.stake_units ? <span style={{ color: "var(--faint)", fontFamily: "IBM Plex Mono", fontSize: 11 }}> · {p.stake_units}u</span> : null}
      </div>
      {isTweet && <TweetEmbed url={p.source_url} />}
      <div className="epick-meta">
        <span>{fmtDate(p.published_at)}</span>
        <span>·</span>
        <span>{p.source}</span>
        {p.source_url && !isTweet && (
          <a href={p.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} style={{ verticalAlign: "-1px" }} /> fuente</a>
        )}
        <span className="x" style={{ marginLeft: "auto" }} onClick={() => onDelete(p.id)}><Trash2 size={13} /></span>
      </div>
    </div>
  );
}
