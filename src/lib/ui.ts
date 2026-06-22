// Constantes de presentación (colores por nivel / liga, lista de deportes).

export const TIER_COLOR: Record<number, string> = {
  5: "#2fd98a",
  4: "#7fd14e",
  3: "#e0a23b",
  2: "#c47a52",
  1: "#6b7684",
};

export const TIER_WORD: Record<number, string> = {
  5: "Máxima",
  4: "Alta",
  3: "Media",
  2: "Baja",
  1: "Marginal",
};

export const LEAGUE_COLOR: Record<string, string> = {
  "LIGA MX": "#7bc96f",
  CHAMPIONS: "#5b9bd5",
  "LA LIGA": "#6f9bf0",
  "MUNDIAL 2026": "#e0a23b",
  PREMIER: "#8b6fd0",
  LIBERTADORES: "#4eb37a",
  SUDAMERICANA: "#c9a14e",
  NFL: "#c77b5a",
  NBA: "#e08a4e",
  WNBA: "#e36fa0",
  MLB: "#5bb3c9",
  TENIS: "#b6d957",
  "TENIS WTA": "#b6d957",
  WIMBLEDON: "#a3d957",
  "US OPEN": "#5b9bd5",
  "R. GARROS": "#d4884e",
  BOXEO: "#d14b6f",
  UFC: "#d14b5a",
};

export const SPORTS = [
  { id: "futbol", label: "Fútbol" },
  { id: "nfl", label: "NFL" },
  { id: "nba", label: "NBA" },
  { id: "otros", label: "MLB · Tenis · UFC" },
] as const;

export type SportId = (typeof SPORTS)[number]["id"];
