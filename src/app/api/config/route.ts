import { NextResponse } from "next/server";
import { getConfig, updateConfig, type ConfigPatch } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getConfig());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const patch: ConfigPatch = {};
    if (Number.isFinite(body.start_bank) && body.start_bank >= 0) patch.start_bank = body.start_bank;
    if (Number.isFinite(body.kelly_frac) && body.kelly_frac > 0 && body.kelly_frac <= 1) patch.kelly_frac = body.kelly_frac;
    if (Number.isFinite(body.unit_pct) && body.unit_pct > 0 && body.unit_pct <= 100) patch.unit_pct = body.unit_pct;
    if (Number.isFinite(body.stop_loss_pct) && body.stop_loss_pct < 0) patch.stop_loss_pct = body.stop_loss_pct;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada válido para actualizar" }, { status: 400 });
    }
    return NextResponse.json(await updateConfig(patch));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
