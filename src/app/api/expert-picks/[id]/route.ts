import { NextResponse } from "next/server";
import { settleExpertPick, deleteExpertPick } from "@/lib/db";
import type { ExpertPickResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const RESULTS: ExpertPickResult[] = ["pending", "win", "loss", "push", "void"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { result } = await req.json();
    if (!RESULTS.includes(result)) {
      return NextResponse.json({ error: "result inválido" }, { status: 400 });
    }
    await settleExpertPick(id, result);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteExpertPick(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
