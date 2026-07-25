# Implementation Status

## Baseline Audit (Phase 0)

| Check | Result |
|-------|--------|
| Build | ✅ Passes |
| Tests | ✅ 30/30 (7 files) |
| Lint | ✅ 0 errors, 40 warnings (unused imports, hook deps) |
| Deploy | ✅ Live at https://malta-osint.vercel.app |

## Architecture That Can Be Reused

- Next.js 16.2 App Router + TypeScript 5
- Tailwind v4 + CSS design tokens (gold/cyan/void theme)
- MapLibre GL 5.24 with CartoCDN dark-matter tiles
- Smart System module (review, persistence, ingestion pipeline)
- Existing API routes for earthquakes, fires, flights, news, AIS
- ErrorBoundary component
- Malta map component with vessel/flight/seismic/fire rendering
- AIS WebSocket relay architecture (scanner + ngrok tunnel)

## Architecture That Needs Replacement

- Monolithic `/api/malta/live` endpoint bundles all feeds together
- No canonical `IntelligenceEvent` model — ad-hoc types per adapter
- No source registry — feeds are hard-coded in the monolithic route
- No `AdapterResult` pattern — each function returns different shapes
- No source-health tracking beyond a simple `SourceMeta`
- No minister's briefing, country profiles, or command centre UI
- No confidence scoring, Malta relevance scoring, or entity extraction
- No source registry, no Zod validation, no centralized security helpers
- News is Malta-only RSS + Telegram scraping
- FIRMS bbox error message still says "Malta"
- Tests only cover Smart System (no API tests, no adapter tests)

## External Credentials Required

| Variable | Service | Status |
|----------|---------|--------|
| FIRMS_API_KEY | NASA FIRMS | ✅ Set |
| RELIEFWEB_APP_NAME | ReliefWeb API | 🔲 Not set |
| UN_COMTRADE_API_KEY | UN Comtrade | 🔲 Not set |
| AISSTREAM_API_KEY | AISstream.io | ✅ Set |
| GEMINI_API_KEY_1 | Google Gemini | ✅ Set |
| UPSTASH_* | Upstash Redis | ✅ Set |
| SCANNER_URL/KEY | Local scanner | ✅ Set |

Missing keys degrade cleanly (unconfigured state).

## Current Phase

Phase 0 complete. Starting Phase 1.

## Files Changed This Session

- _None yet_

## Tests Run

- `npm run lint` — 0 errors, 40 warnings
- `npm test` — 30/30 pass
- `npm run build` — passes

## Next Automatic Step

Phase 1: Foundation — create canonical types, Zod schemas, source registry, health model, repository abstraction, API envelope, security helpers.
