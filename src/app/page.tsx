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
  let dbError = false;

  if (hasSupabaseEnv) {
    try {
      [config, opportunities, bets] = await Promise.all([
        getConfig(),
        getOpportunities(),
        getBets(),
      ]);
      demo = false;
    } catch (e) {
      // Hay llaves configuradas pero la DB falló → es un ERROR, no demo intencional.
      console.error("Supabase no disponible, usando datos demo:", e);
      dbError = true;
    }
  }

  return (
    <Dashboard
      initialConfig={config}
      initialOpportunities={opportunities}
      initialBets={bets}
      demo={demo}
      dbError={dbError}
      gated={Boolean(process.env.APP_PASSWORD)}
    />
  );
}
