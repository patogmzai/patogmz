# Scanner de Valor

App web personal de apuestas deportivas: recomendaciones ranqueadas por un **score de confianza 1–5**, dimensionamiento con **Kelly fraccionado** sobre tu banca viva, parlays, y una **bitácora honesta** que recalcula tu banca conforme marcas resultados.

> Herramienta de **decisión**, no una garantía de ganar. La confianza mide la **fuerza del valor** (edge), no predice el resultado. Un 5★ también pierde. La matemática es determinística; un LLM, si se usa, solo redacta contexto — nunca elige la apuesta.

## Stack

- **Next.js** (App Router, TypeScript) en Vercel
- **Supabase** (Postgres) — un solo usuario
- **The Odds API** — momios, con **Pinnacle** (región EU) como ancla sharp
- Gate de un usuario por contraseña (middleware)
- CSS plano (look de terminal de trading)

## La matemática (`src/lib/betting.ts`, con tests)

- Prob. implícita: `1 / momio`
- De-vig multiplicativo sobre la línea sharp → prob. justa (suma 1)
- `EV = prob_justa × momio − 1`
- Confianza 1–5: fuerza del EV, capada por varianza (longshots ≤ 3★)
- Stake: Kelly fraccionado, topado a la unidad
- Parlay: producto de momios/probs, tope reducido (×0.4)

`npm test` corre la suite (matemática + motor de escaneo).

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests
npm run build      # build de producción
```

Sin `.env.local`, la app corre en **modo demo** (datos mock) — no necesitas nada para verla.

## Variables de entorno

Copia los huecos en `.env.local` (ver `.env.example`):

| Variable | Para qué |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secreta) |
| `ODDS_API_KEY` | the-odds-api.com (free tier: 500 créditos/mes) |
| `ODDS_API_BASE_URL` | opcional (default `https://api.the-odds-api.com/v4`) |
| `CRON_SECRET` | cadena al azar; protege `/api/scan` |
| `APP_PASSWORD` | contraseña del gate (vacía = sin gate) |

## Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. SQL Editor → pega `supabase/schema.sql` → Run (crea tablas, vistas, RLS).
3. Copia URL + service_role a las env vars.

RLS queda activo **sin policies**: el acceso público se deniega; el servidor usa la service role key (la bypassa). El cliente nunca habla directo con la DB.

## Deploy a Vercel (gratis)

1. **Sube el código a GitHub:**
   ```bash
   git init && git add . && git commit -m "Scanner de Valor"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/scanner-de-valor.git
   git push -u origin main
   ```
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo. Detecta Next.js solo.
3. En **Settings → Environment Variables**, agrega las 6 variables de arriba (con valores reales). **Pon `APP_PASSWORD`** para activar el gate en producción.
4. **Deploy.** Listo.

### Escaneo automático (gratis)

- El `vercel.json` ya trae un cron **diario** (Hobby permite 1/día). Corre `/api/scan` solo; Vercel manda `Authorization: Bearer <CRON_SECRET>` automáticamente.
- ¿Quieres más seguido sin pagar? Agrega un cron externo gratis ([cron-job.org](https://cron-job.org)) que haga GET cada 6–12 h a:
  ```
  https://TU-APP.vercel.app/api/scan
  Header: Authorization: Bearer <CRON_SECRET>
  ```
  Vigila `credits_remaining` en la respuesta para no pasarte de 500/mes.
- Cada-30-min nativo requiere Vercel Pro (`schedule: "*/30 * * * *"`).

### Primer escaneo

El cron lo hará en su próximo tick. Para dispararlo a mano:
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://TU-APP.vercel.app/api/scan
```

## Flujo de uso

1. El escaneo señala valor vs. la línea sharp y rankea por confianza.
2. Confirmas el **momio real de Playdoit** en la tarjeta → EV y stake se recalculan contra ese precio.
3. Registras (al precio de Playdoit) → la banca y el ROI se actualizan solos desde la bitácora.
4. Sección aparte de **picks de apostadores famosos**: solo verídicos, con enlace de fuente.

Salvaguardas de primera clase: stop-loss semanal, tope de Kelly, P&L honesto que incluye pérdidas, disclaimer en la UI.
