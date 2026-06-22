import { NextResponse } from "next/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.json({ ok: true }); // sin gate configurado

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (password !== pw) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  // Mismo hash que valida el middleware (SHA-256 hex de la contraseña).
  const token = createHash("sha256").update(pw).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sv_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}
