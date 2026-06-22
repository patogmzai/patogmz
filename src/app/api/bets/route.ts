import { NextResponse } from "next/server";
import { getBets, addBet, type NewBet } from "@/lib/db";
import type { BetKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: BetKind[] = ["single", "parlay", "manual"];

export async function GET() {
  try {
    return NextResponse.json(await getBets());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    if (typeof b.pick !== "string" || !b.pick.trim()) {
      return NextResponse.json({ error: "pick requerido" }, { status: 400 });
    }
    if (!(Number.isFinite(b.odds) && b.odds > 1)) {
      return NextResponse.json({ error: "odds debe ser > 1" }, { status: 400 });
    }
    if (!(Number.isFinite(b.stake) && b.stake >= 0)) {
      return NextResponse.json({ error: "stake inválido" }, { status: 400 });
    }
    const kind: BetKind = KINDS.includes(b.kind) ? b.kind : "manual";
    const bet: NewBet = {
      league: b.league ?? null,
      pick: b.pick.trim(),
      odds: b.odds,
      stake: Math.round(b.stake),
      kind,
      fair_prob: Number.isFinite(b.fair_prob) ? b.fair_prob : null,
      tier: Number.isInteger(b.tier) && b.tier >= 1 && b.tier <= 5 ? b.tier : null,
      market: typeof b.market === "string" && b.market.trim() ? b.market.trim() : null,
      sport: typeof b.sport === "string" && b.sport.trim() ? b.sport.trim() : null,
      opportunity_id: typeof b.opportunity_id === "string" ? b.opportunity_id : null,
    };
    return NextResponse.json(await addBet(bet));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
