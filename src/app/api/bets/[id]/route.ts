import { NextResponse } from "next/server";
import { settleBet, deleteBet } from "@/lib/db";
import type { BetResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const RESULTS: BetResult[] = ["pending", "win", "loss", "push"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { result } = await req.json();
    if (!RESULTS.includes(result)) {
      return NextResponse.json({ error: "result inválido" }, { status: 400 });
    }
    await settleBet(id, result);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteBet(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
