import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de SERVIDOR. Usa la service role key, que bypassa RLS.
 * NUNCA importes este módulo desde un componente de cliente.
 *
 * No truena al importar: si faltan las llaves, `hasSupabaseEnv` es false y la
 * app cae a modo demo (datos mock). Solo truena si intentas usar la DB sin llaves.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseEnv = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno."
    );
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
