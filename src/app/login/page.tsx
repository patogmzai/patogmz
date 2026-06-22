"use client";
import { useState, type FormEvent } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (r.ok) window.location.href = "/";
    else setErr("Contraseña incorrecta");
  };

  return (
    <div className="sv-root">
      <div className="login-wrap">
        <form className="login-card" onSubmit={submit}>
          <h1 className="disp">Scanner de Valor</h1>
          <div className="sub">Acceso privado</div>
          <label htmlFor="pw">Contraseña</label>
          <input id="pw" type="password" value={pw} autoFocus
            onChange={(e) => setPw(e.target.value)} aria-label="Contraseña" />
          <button type="submit" disabled={busy || !pw}>{busy ? "Entrando…" : "Entrar"}</button>
          {err && <div className="login-err">{err}</div>}
        </form>
      </div>
    </div>
  );
}
