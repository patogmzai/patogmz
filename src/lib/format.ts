import type { Bet } from "./types";

/** Formato de dinero MXN, redondeado. */
export const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

/** Fecha corta es-MX a partir de un ISO timestamp: "hoy" o "19 jun". */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "hoy";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })
    .format(d)
    .replace(".", "");
}

/** Hora del partido: "hoy 19:00", "mañana 14:30", o "24 jun 20:00". */
export function fmtGameTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (sameDay(d, now)) return `hoy ${time}`;
  if (sameDay(d, tom)) return `mañana ${time}`;
  const date = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d).replace(".", "");
  return `${date} ${time}`;
}

/** P&L de una apuesta liquidada (win → ganancia neta, loss → -stake, push/pending → 0). */
export const betPL = (b: Bet) =>
  b.result === "win" ? b.stake * (b.odds - 1) : b.result === "loss" ? -b.stake : 0;
