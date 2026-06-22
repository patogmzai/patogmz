import { NextResponse, type NextRequest } from "next/server";

// Gate de un solo usuario. Si APP_PASSWORD no está configurada (dev local),
// no hay gate. La cookie guarda el SHA-256 de la contraseña, no la contraseña.
const COOKIE = "sv_auth";

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next(); // sin contraseña → libre (modo dev/demo)

  const expected = await sha256hex(pw);
  const token = req.cookies.get(COOKIE)?.value;
  if (token === expected) return NextResponse.next();

  // API → 401 JSON. Páginas → redirige a /login.
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

// Corre en todo menos login/logout, su API, el cron (CRON_SECRET) y estáticos.
export const config = {
  matcher: ["/((?!login|api/login|api/logout|api/scan|_next/static|_next/image|favicon.ico).*)"],
};
