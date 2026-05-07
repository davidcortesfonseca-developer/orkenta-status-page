# Orkenta Status Page (`status.orkenta-ia.com`)

> Página pública con uptime histórico (90 días), incidentes activos y resueltos.
> Stack: Astro 5 estático + GitHub Actions cron + Cloudflare Pages.

## Arquitectura

```
GitHub Actions cron (cada 5 min)
   └─ scripts/healthcheck.mjs  pings 4 servicios (app, api, download, marketing)
        └─ append /history/YYYY-MM.json + commit [skip ci] al repo

Astro static site
   ├─ src/pages/index.astro       overview con 4 servicios + UptimeBar 90d
   ├─ src/pages/incidents.astro   historial cronológico
   └─ build → /dist (static HTML+CSS, sin JS runtime)

Cloudflare Pages
   ├─ Auto-deploy on push a main
   └─ DNS: status.orkenta-ia.com → CNAME a orkenta-status-page.pages.dev
```

## Setup desde cero

### 1. Local dev

```bash
cd infrastructure/status-page
pnpm install
pnpm dev          # http://localhost:4321
```

### 2. Healthcheck local (sin commit)

```bash
node scripts/healthcheck.mjs
# Crea history/2026-05.json si no existe, appends 1 entry por servicio
```

### 3. Deploy a Cloudflare Pages

#### Pre-requisitos owner

Crear cuenta gratuita en [cloudflare.com/products/pages/](https://www.cloudflare.com/products/pages/):
1. Sign up con email Orkenta.
2. Settings → API Tokens → Create Token → Cloudflare Pages template → permitir Pages:Edit + Account:Read.
3. Copy `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (el accountId está en URL del dashboard).

Agregar a GitHub repo Settings → Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Crear el proyecto Pages:
- Cloudflare dashboard → Pages → Create project → Direct upload
- Project name: **orkenta-status-page**
- Production branch: `main`

#### DNS (cuando esté listo)

En el provider de DNS de `orkenta-ia.com` (probablemente Squarespace):
```
CNAME  status  orkenta-status-page.pages.dev.
```

Cloudflare Pages provee SSL automático para custom domains.

### 4. Activar el cron

El workflow `healthcheck.yml` ya corre desde el primer push. Verifica en GitHub → Actions → "healthcheck".

⚠️ Nota: GitHub Actions cron puede tener latencia 5-15 min en la práctica (no es exactamente cada 5 min). Si necesitas precisión menor migrar a EventBridge → Lambda más adelante.

## Estructura de archivos

```
infrastructure/status-page/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
├── src/
│   ├── config.ts             # 4 servicios monitoreados + SITE constants
│   ├── layouts/Layout.astro  # head + nav + footer + tokens CSS inline
│   ├── pages/
│   │   ├── index.astro       # overview con uptime bars
│   │   └── incidents.astro   # historial
│   ├── components/
│   │   ├── ServiceStatus.astro
│   │   ├── UptimeBar.astro
│   │   └── IncidentBanner.astro
│   └── lib/
│       ├── history.ts        # loader + aggregations
│       └── incidents.ts      # markdown frontmatter parser
├── scripts/
│   └── healthcheck.mjs       # node script invocado por GH Actions
├── history/
│   └── YYYY-MM.json          # generado por el cron, commiteado al repo
├── incidents/
│   └── YYYY-MM-DD-slug.md    # cada incidente como markdown con frontmatter
└── .github/workflows/
    ├── healthcheck.yml       # cron */5 * * * *
    └── deploy.yml            # on push to main → CFP
```

## Cómo registrar un incidente

Crear `incidents/YYYY-MM-DD-slug.md` con frontmatter:

```markdown
---
id: 2026-05-08-api-down
title: API caída en us-east-2
started: 2026-05-08T14:23:00Z
resolved: null            # poner ISO-8601 cuando se resuelva
severity: P1              # P1 / P2 / P3 / P4
services: [api, app]
---

## 14:23 COT — Detección
Healthcheck reporta 504 en /api/system/auth/me.

## 14:35 COT — Mitigación
Restart de container api...
```

Push a main → Cloudflare Pages re-build automático en ~2 min → la página actualizada.

## Servicios monitoreados (editar `src/config.ts` y `scripts/healthcheck.mjs`)

| ID | Severidad | Endpoint |
|---|---|---|
| `app` | P1 | https://app.orkenta-ia.com/app/ |
| `api` | P1 | https://app.orkenta-ia.com/api/system/auth/me |
| `download` | P3 | https://download.orkenta-ia.com/mobile/orkenta-android-v1.0.0.apk |
| `marketing` | P3 | https://orkenta-ia.com/ |

⚠️ Ambas listas (TS y .mjs) están duplicadas para que el healthcheck corra sin imports de TS. Si modificas una, modificá la otra.

## Costos

- GitHub Actions: 2000 min gratis/mes en plan free. Cada run del cron usa ~10s → 30 min/mes total (288 ejecuciones × ~6s). Sobra mucho margen.
- Cloudflare Pages: gratis hasta 500 builds/mes y 100GB egress/mes.
- DNS: ya tenemos el dominio.
- **Total**: $0/mes.

## Migración futura a Better Stack (cuando >10 clientes Scale)

Cuando empiece a doler mantener esto manual, migrar a [Better Stack](https://betterstack.com/uptime) o [Statuspage.io](https://statuspage.io/):

| Servicio | $/mes | Pro |
|---|---|---|
| Better Stack | $29 | Branding propio + SMS notifications + auto-detect |
| Statuspage.io | $29 | Más enterprise + auditoría |

## Roadmap V2

- [ ] Endpoint para subscribirse a notificaciones por email cuando hay incidente
- [ ] Webhook desde CloudWatch alarms → auto-incident creation
- [ ] Visualización de latencia (no solo uptime)
- [ ] RSS feed de incidentes
- [ ] Historical CSV download

## Owner action items

- [ ] Crear cuenta Cloudflare + agregar secrets en GitHub
- [ ] Apuntar DNS `status.orkenta-ia.com` → CNAME a `orkenta-status-page.pages.dev`
- [ ] Validar primer healthcheck commit en `history/`
- [ ] Linkear desde landing y app footer

## Local healthcheck output esperado

```text
[healthcheck] 2026-05-07T15:23:01.000Z — running 4 checks
  OK   app          200 412ms
  OK   api          401 387ms
  OK   download     200 142ms
  OK   marketing    200 234ms
[healthcheck] done
```
