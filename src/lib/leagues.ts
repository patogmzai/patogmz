// Ligas a escanear con sus sport keys de The Odds API y mercados.
// v1 de mercados: h2h (ML/1X2), totals (over/under), btts (ambos anotan en fútbol).
// Los spreads/hándicap se agregan después: requieren emparejar puntos espejados.
export interface LeagueConfig {
  key: string;       // sport key de The Odds API
  label: string;     // nombre de liga (coincide con LEAGUE_COLOR)
  sport: string;     // filtro del dashboard: futbol | nfl | nba | otros
  markets: string[]; // market keys de The Odds API
}

export const LEAGUES: LeagueConfig[] = [
  { key: "soccer_mexico_ligamx",      label: "LIGA MX",      sport: "futbol", markets: ["h2h", "totals", "btts"] },
  { key: "soccer_uefa_champs_league", label: "CHAMPIONS",    sport: "futbol", markets: ["h2h", "totals", "btts"] },
  { key: "soccer_spain_la_liga",      label: "LA LIGA",      sport: "futbol", markets: ["h2h", "totals", "btts"] },
  { key: "soccer_fifa_world_cup",     label: "MUNDIAL 2026", sport: "futbol", markets: ["h2h", "totals", "btts"] },
  { key: "americanfootball_nfl",      label: "NFL",          sport: "nfl",    markets: ["h2h", "totals"] },
  { key: "basketball_nba",            label: "NBA",          sport: "nba",    markets: ["h2h", "totals"] },
  { key: "baseball_mlb",              label: "MLB",          sport: "otros",  markets: ["h2h", "totals"] },
  { key: "mma_mixed_martial_arts",    label: "UFC",          sport: "otros",  markets: ["h2h"] },
  // Tenis: The Odds API usa keys por torneo (tennis_atp_*, tennis_wta_*) que cambian
  // con el calendario. Se agregan los activos cuando toque; el escaneo ignora ligas
  // fuera de temporada sin romperse.
];
