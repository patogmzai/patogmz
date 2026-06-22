import Dashboard from "@/components/Dashboard";
import { hasSupabaseEnv } from "@/lib/supabase";
import { getConfig, getOpportunities, getBets, getExpertPicks } from "@/lib/db";
import { mockConfig, mockOpportunities, mockBets, mockExpertPicks } from "@/lib/mock";
import type { Config, Opportunity, Bet, ExpertPick } from "@/lib/types";

// Lee datos frescos de la DB en cada request (app personal always-on).
export const dynamic = "force-dynamic";

export default async function Home() {
  let config: Config = mockConfig;
  let opportunities: Opportunity[] = mockOpportunities;
  let bets: Bet[] = mockBets;
  let expertPicks: ExpertPick[] = mockExpertPicks;
  let demo = true;

  if (hasSupabaseEnv) {
    try {
      [config, opportunities, bets, expertPicks] = await Promise.all([
        getConfig(),
        getOpportunities(),
        getBets(),
        getExpertPicks(),
      ]);
      demo = false;
    } catch (e) {
      // Si Supabase falla (llaves malas, schema sin correr…), cae a demo sin romper la página.
      console.error("Supabase no disponible, usando datos demo:", e);
    }
  }

  return (
    <Dashboard
      initialConfig={config}
      initialOpportunities={opportunities}
      initialBets={bets}
      initialExpertPicks={expertPicks}
      demo={demo}
      gated={Boolean(process.env.APP_PASSWORD)}
    />
  );
}
