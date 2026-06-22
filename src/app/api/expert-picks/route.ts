import { NextResponse } from "next/server";
import { getExpertPicks, addExpertPick, type NewExpertPick } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getExpertPicks());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const p = await req.json();
    // Sin fuente no entra: la sección es "solo verídicos, con fuente".
    if (typeof p.expert_name !== "string" || !p.expert_name.trim()) {
      return NextResponse.json({ error: "expert_name requerido" }, { status: 400 });
    }
    if (typeof p.pick !== "string" || !p.pick.trim()) {
      return NextResponse.json({ error: "pick requerido" }, { status: 400 });
    }
    if (typeof p.source !== "string" || !p.source.trim()) {
      return NextResponse.json({ error: "source requerido" }, { status: 400 });
    }
    if (typeof p.source_url !== "string" || !p.source_url.trim()) {
      return NextResponse.json({ error: "source_url requerido (sin fuente no se registra)" }, { status: 400 });
    }
    if (p.odds != null && !(Number.isFinite(p.odds) && p.odds > 1)) {
      return NextResponse.json({ error: "odds debe ser > 1 o nulo" }, { status: 400 });
    }
    const pick: NewExpertPick = {
      expert_name: p.expert_name.trim(),
      source: p.source.trim(),
      source_url: p.source_url.trim(),
      published_at: p.published_at ?? new Date().toISOString(),
      league: p.league ?? null,
      sport: p.sport ?? null,
      match: p.match ?? null,
      pick: p.pick.trim(),
      odds: p.odds ?? null,
      stake_units: Number.isFinite(p.stake_units) ? p.stake_units : null,
      rationale: p.rationale ?? null,
      verified: Boolean(p.verified),
      result: "pending",
    };
    return NextResponse.json(await addExpertPick(pick));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
