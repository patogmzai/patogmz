// Helpers de cliente para llamar a las rutas API.
import type { Bet, ExpertPick, BetResult, ExpertPickResult, ConfigPatchInput } from "./types";

async function jsonOrThrow<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`${r.status} ${t}`);
  }
  return r.json() as Promise<T>;
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const put = (url: string, body: unknown) =>
  fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const patch = (url: string, body: unknown) =>
  fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const del = (url: string) => fetch(url, { method: "DELETE" });

export type AddBetInput = Pick<Bet, "league" | "pick" | "odds" | "stake" | "kind" | "fair_prob" | "opportunity_id">;
export type AddExpertPickInput = Omit<ExpertPick, "id" | "captured_at">;

export const api = {
  updateConfig: (p: ConfigPatchInput) => put("/api/config", p).then((r) => jsonOrThrow(r)),

  addBet: (b: AddBetInput) => post("/api/bets", b).then((r) => jsonOrThrow<Bet>(r)),
  settleBet: (id: string, result: BetResult) => patch(`/api/bets/${id}`, { result }).then((r) => jsonOrThrow(r)),
  deleteBet: (id: string) => del(`/api/bets/${id}`).then((r) => jsonOrThrow(r)),

  addExpertPick: (p: AddExpertPickInput) => post("/api/expert-picks", p).then((r) => jsonOrThrow<ExpertPick>(r)),
  settleExpertPick: (id: string, result: ExpertPickResult) =>
    patch(`/api/expert-picks/${id}`, { result }).then((r) => jsonOrThrow(r)),
  deleteExpertPick: (id: string) => del(`/api/expert-picks/${id}`).then((r) => jsonOrThrow(r)),
};
