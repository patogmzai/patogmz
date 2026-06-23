import { NextResponse } from "next/server";
import { runScan } from "@/lib/scan";
import { getSupabaseAdmin } from "@/lib/supabase";

// Escaneo bajo demanda, disparado por el usuario logueado (lo protege el middleware
// por cookie — no necesita el CRON_SECRET). Throttle de 10 min para no quemar créditos.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COOLDOWN_MS = 10 * 60 * 1000;

export async function POST() {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("opportunities")
      .select("scanned_at")
      .order("scanned_at", { ascending: false })
      .limit(1);
    const last = data?.[0]?.scanned_at as string | undefined;
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      if (elapsed < COOLDOWN_MS) {
        const mins = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
        return NextResponse.json({
          throttled: true,
          message: `Escaneo muy reciente — espera ~${mins} min para no gastar créditos de más.`,
        });
      }
    }
    return NextResponse.json(await runScan());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
