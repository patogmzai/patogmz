// Ligas a escanear con sus sport keys de The Odds API y mercados.
// La lista es amplia a propósito: el pre-chequeo de temporada (fetchActiveSports)
// solo gasta créditos en las que están ACTIVAS hoy. Así hay contenido todo el año:
// en verano juegan MLB/WNBA/tenis/Libertadores/Mundial; en otoño NFL/NBA/Liga MX/etc.
// Mercados: h2h (ML/1X2) + totals. Limpios de de-vigar y económicos en créditos.
export interface LeagueConfig {
  key: string;       // sport key de The Odds API
  label: string;     // nombre de liga (badge)
  sport: string;     // filtro del dashboard: futbol | nfl | nba | otros
  markets: string[]; // market keys de The Odds API
}

const SOCCER = ["h2h", "totals"];
const US = ["h2h", "totals"];
const SOLO = ["h2h"]; // tenis, MMA, boxeo: solo ganador

export const LEAGUES: LeagueConfig[] = [
  // --- Fútbol ---
  { key: "soccer_fifa_world_cup", label: "MUNDIAL 2026", sport: "futbol", markets: SOCCER },
  { key: "soccer_mexico_ligamx", label: "LIGA MX", sport: "futbol", markets: SOCCER },
  { key: "soccer_uefa_champs_league", label: "CHAMPIONS", sport: "futbol", markets: SOCCER },
  { key: "soccer_spain_la_liga", label: "LA LIGA", sport: "futbol", markets: SOCCER },
  { key: "soccer_conmebol_copa_libertadores", label: "LIBERTADORES", sport: "futbol", markets: SOCCER },

  // --- US ---
  { key: "americanfootball_nfl", label: "NFL", sport: "nfl", markets: US },
  { key: "basketball_nba", label: "NBA", sport: "nba", markets: US },
  { key: "basketball_wnba", label: "WNBA", sport: "nba", markets: US },
  { key: "baseball_mlb", label: "MLB", sport: "otros", markets: US },

  // --- Combate ---
  { key: "mma_mixed_martial_arts", label: "UFC", sport: "otros", markets: SOLO },

  // --- Tenis (claves por torneo; el filtro de temporada activa el vigente) ---
  { key: "tennis_atp_wimbledon", label: "WIMBLEDON", sport: "otros", markets: SOLO },
  { key: "tennis_wta_wimbledon", label: "WIMBLEDON", sport: "otros", markets: SOLO },
  { key: "tennis_wta_bad_homburg_open", label: "TENIS WTA", sport: "otros", markets: SOLO },
  { key: "tennis_atp_us_open", label: "US OPEN", sport: "otros", markets: SOLO },
  { key: "tennis_wta_us_open", label: "US OPEN", sport: "otros", markets: SOLO },
  { key: "tennis_atp_french_open", label: "R. GARROS", sport: "otros", markets: SOLO },
  { key: "tennis_wta_french_open", label: "R. GARROS", sport: "otros", markets: SOLO },
];
