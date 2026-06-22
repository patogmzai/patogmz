import { NextResponse } from "next/server";
import { runScan } from "@/lib/scan";
import { autoFetchExpertPicks } from "@/lib/fetch-picks";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // varias ligas en red; en Vercel Pro hasta 300s

// Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` si CRON_SECRET está en el entorno.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sin secreto (dev local), se permite
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  try {
    const [scanResult, picksResult] = await Promise.all([
      runScan(),
      autoFetchExpertPicks().catch((e) => ({ found: 0, saved: 0, errors: [String(e)] })),
    ]);
    return NextResponse.json({ ...scanResult, expert_picks: picksResult });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: lo usa Vercel Cron y también sirve para disparar a mano en el navegador.
export const GET = handle;
// POST: por si prefieres dispararlo así desde un cron externo.
export const POST = handle;
