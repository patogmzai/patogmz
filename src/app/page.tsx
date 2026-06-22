import Dashboard from "@/components/Dashboard";
import { hasSupabaseEnv } from "@/lib/supabase";
import { getConfig, getOpportunities, getBets } from "@/lib/db";
import { mockConfig, mockOpportunities, mockBets } from "@/lib/mock";
import type { Config, Opportunity, Bet } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let config: Config = mockConfig;
  let opportunities: Opportunity[] = mockOpportunities;
  let bets: Bet[] = mockBets;
  let demo = true;

  if (hasSupabaseEnv) {
    try {
      [config, opportunities, bets] = await Promise.all([
        getConfig(),
        getOpportunities(),
        getBets(),
      ]);
      demo = false;
    } catch (e) {
      console.error("Supabase no disponible, usando datos demo:", e);
    }
  }

  return (
    <Dashboard
      initialConfig={config}
      initialOpportunities={opportunities}
      initialBets={bets}
      demo={demo}
      gated={Boolean(process.env.APP_PASSWORD)}
    />
  );
}
