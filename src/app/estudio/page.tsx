import Estudio from "@/components/Estudio";
import { hasSupabaseEnv } from "@/lib/supabase";
import { getBets } from "@/lib/db";
import { mockBets } from "@/lib/mock";
import type { Bet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EstudioPage() {
  let bets: Bet[] = mockBets;
  if (hasSupabaseEnv) {
    try {
      bets = await getBets();
    } catch (e) {
      console.error("Supabase no disponible, usando datos demo:", e);
    }
  }
  return <Estudio bets={bets} />;
}
