// Cappers públicos conocidos — publican picks en redes con récord verificable.
// Esta lista es un punto de partida; agrégale/quítale según tu experiencia.
// NO es un endorsement — solo facilita encontrar sus posts rápido.
export interface Capper {
  name: string;
  handle: string;
  platform: "X" | "Instagram" | "YouTube";
  url: string;
  sport: string;
  note: string;
}

export const CAPPERS: Capper[] = [
  { name: "Captain Jack Andrews", handle: "@capjack2000", platform: "X", url: "https://x.com/capjack2000", sport: "NFL · NBA", note: "Ex-AP, publica análisis con líneas sharp" },
  { name: "Spanky", handle: "@Spanky", platform: "X", url: "https://x.com/Spanky", sport: "NFL", note: "Sharp legendario, picks selectos" },
  { name: "Warren Sharp", handle: "@SharpFootball", platform: "X", url: "https://x.com/SharpFootball", sport: "NFL", note: "Analista de datos NFL, publica tendencias y picks" },
  { name: "Rufus Peabody", handle: "@RufusPeabody", platform: "X", url: "https://x.com/RufusPeabody", sport: "Multi", note: "Modelador profesional, publica picks selectos" },
  { name: "Steve Fezzik", handle: "@FezzikSports", platform: "X", url: "https://x.com/FezzikSports", sport: "Multi", note: "Ganador múltiple de contests de Las Vegas" },
  { name: "Jefe de Apuestas MX", handle: "@jefeapuestasmx", platform: "X", url: "https://x.com/jefeapuestasmx", sport: "Liga MX · Fútbol", note: "Capea Liga MX y fútbol internacional" },
];
