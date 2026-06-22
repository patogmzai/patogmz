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

/** P&L de una apuesta liquidada (win → ganancia neta, loss → -stake, push/pending → 0). */
export const betPL = (b: Bet) =>
  b.result === "win" ? b.stake * (b.odds - 1) : b.result === "loss" ? -b.stake : 0;
