"use client";
import { useState } from "react";
import { Star, Plus, Trash2, CircleCheck, CircleX, ExternalLink, ShieldCheck, Users } from "lucide-react";
import { decToAmerican } from "@/lib/betting";
import { fmtDate } from "@/lib/format";
import { LEAGUE_COLOR } from "@/lib/ui";
import { CAPPERS } from "@/lib/cappers";
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
  const [showCappers, setShowCappers] = useState(false);

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

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-pad">
        <div className="card-h"><Star size={13} /> Picks de apostadores famosos — solo verídicos, con fuente</div>

        {/* CAPPERS LIST */}
        <div className="cappers-toggle" onClick={() => setShowCappers((v) => !v)}>
          <Users size={13} /> {showCappers ? "Ocultar" : "Ver"} cappers que publican picks ({CAPPERS.length})
        </div>
        {showCappers && (
          <div className="cappers-list">
            {CAPPERS.map((c) => (
              <a key={c.handle} href={c.url} target="_blank" rel="noopener noreferrer" className="capper-card">
                <div className="capper-name">{c.name} <span className="capper-handle">{c.handle}</span></div>
                <div className="capper-meta">{c.platform} · {c.sport}</div>
                <div className="capper-note">{c.note}</div>
              </a>
            ))}
            <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 6 }}>
              Checa sus perfiles, y cuando publiquen un pick, copia la URL del post y pégala abajo.
            </div>
          </div>
        )}

        <div className="expert-rec">
          <span>récord registrado <span className="n">{wins}–{losses}</span></span>
          <span>rendimiento {roiU === null ? <span className="n">—</span> : <span className="n" style={{ color: roiU >= 0 ? "var(--pos)" : "var(--neg)" }}>{roiU >= 0 ? "+" : ""}{roiU.toFixed(1)}%</span>} <span style={{ color: "var(--faint)" }}>(en unidades)</span></span>
          <span style={{ color: "var(--faint)", fontSize: 11 }}>el récord se construye conforme marcas resultados</span>
        </div>

        {picks.length === 0 ? (
          <div className="empty">Aún no hay picks. Busca en los perfiles de arriba, y cuando publiquen un pick, pega la URL del tweet/post abajo. Se incrusta el post real.</div>
        ) : (
          <div className="epicks">
            {picks.map((p) => {
              const lc = (p.league && LEAGUE_COLOR[p.league]) || "var(--dim)";
              const isTweet = isTwitterUrl(p.source_url);
              return (
                <div className="epick" key={p.id}>
                  <div className="epick-top">
                    <span className="who">
                      {p.expert_name}
                      <span className={"ver " + (p.verified ? "on" : "off")}>{p.verified ? "verificado" : "sin verificar"}</span>
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
                  {p.rationale && !isTweet && <div className="epick-rat">{p.rationale}</div>}
                  <div className="epick-meta">
                    <span>{fmtDate(p.published_at)}</span>
                    <span>·</span>
                    <span>{p.source}</span>
                    {p.source_url && p.source_url !== "#" && !isTweet && (
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} style={{ verticalAlign: "-1px" }} /> fuente</a>
                    )}
                    <span className="x" style={{ marginLeft: "auto" }} onClick={() => onDelete(p.id)}><Trash2 size={13} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--line-soft)", margin: "16px 0 14px" }} />
        <div className="card-h" style={{ marginBottom: 12 }}><Plus size={13} /> Registrar pick de un apostador</div>
        <div className="eform">
          <div className="inp"><label>Apostador</label><input value={f.expert_name} placeholder="Ej. Warren Sharp" onChange={(e) => setF({ ...f, expert_name: e.target.value })} /></div>
          <div className="inp"><label>Liga</label><input value={f.league} placeholder="NFL" onChange={(e) => setF({ ...f, league: e.target.value })} /></div>
          <div className="inp"><label>Partido</label><input value={f.match} placeholder="Chiefs vs. Bills" onChange={(e) => setF({ ...f, match: e.target.value })} /></div>
          <div className="inp"><label>Publicado</label><input type="date" value={f.published} onChange={(e) => setF({ ...f, published: e.target.value })} /></div>
          <div className="inp wide"><label>Pick</label><input value={f.pick} placeholder="Bills +2.5" onChange={(e) => setF({ ...f, pick: e.target.value })} /></div>
          <div className="inp"><label>Momio (dec., opc.)</label><input value={f.odds} placeholder="1.95" inputMode="decimal" onChange={(e) => setF({ ...f, odds: e.target.value })} /></div>
          <div className="inp"><label>Unidades (opc.)</label><input value={f.stake_units} placeholder="2" inputMode="decimal" onChange={(e) => setF({ ...f, stake_units: e.target.value })} /></div>
          <div className="inp"><label>Fuente</label><input value={f.source} placeholder="X / @handle" onChange={(e) => setF({ ...f, source: e.target.value })} /></div>
          <div className="inp wide"><label>URL del tweet / post (obligatoria — si es de X/Twitter, se incrusta el post real)</label><input value={f.source_url} placeholder="https://x.com/usuario/status/123..." inputMode="url" onChange={(e) => setF({ ...f, source_url: e.target.value })} /></div>
          <button className="btn go" style={{ alignSelf: "end" }} onClick={submit}><Plus size={14} /> Agregar pick</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 10, display: "flex", gap: 7, alignItems: "flex-start" }}>
          <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1, color: "var(--gold)" }} />
          Solo picks que el apostador realmente publicó. Si pegas una URL de X/Twitter, el tweet se muestra directo aquí. Esta sección es informativa: no alimenta las recomendaciones.
        </div>
      </div>
    </div>
  );
}
