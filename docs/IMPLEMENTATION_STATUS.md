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

## Phase 1 Complete — Foundation

Created `src/intelligence/` module:

- `types/index.ts` — canonical `IntelligenceEvent`, `EvidenceRecord`, `ClaimRecord`, `IntelligenceEntity`, `MinisterBriefItem`, `CountryProfile`, `SourceHealthRecord`
- `schemas/registry.ts` — Zod-style validators (`SourceCostProfile`, `IntelligenceSourceDefinition`, `AdapterResult`, `SourceHealthRecord`)
- `schemas/api-envelope.ts` — `createEnvelope`, `createErrorEnvelope` envelope contract
- `schemas/source-registry.ts` — 16-source registry (aviation, geospatial, maritime, news, eu-policy, diplomatic, humanitarian, multilateral, economic, sanctions)
- `repository/index.ts` — repository abstraction (`IntelligenceRepository` interface)
- `repository/memory.ts` — in-memory implementation + lazy `globalRepository` Proxy that ties to Redis if `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` present
- `repository/redis.ts` — Upstash Redis-backed implementation with pipeline-friendly `mget` ↔ `pipeline.get` patterns and Object/auto-JSON parsing handling
- `confidence/` — multi-signal confidence scoring + verification-state derivation
- `relevance/` — Malta-relevance scoring (mentions, central-med proximity, EU binding decisions, humanitarian, sanctions, multilateral, consular, trade exposure)
- `briefing/` — `generateBriefing` → `MinisterBriefItem[]` with `whyItMattersToMalta` + `possibleFollowUp`
- `classification/` — keyword/heuristic categoriser into canonical category set
- `source-health/` — `determineHealth`, `createSourceHealthRecord` (consecutive-failure breaker)
- `licensing/` — domain-specific licence/attribution model

## Phase 2 Complete — Repair Live Feeds


Created independent routes (each follows `AdapterResult` shape, records health):

- `GET /api/live/aviation` — OpenSky fallback chain
- `GET /api/live/seismic` — USGS Earthquakes
- `GET /api/live/fires` — NASA FIRMS + public fallback
- `GET /api/live/marine` — Open-Meteo Marine
- `GET /api/live/news` — Malta-only RSS aggregation
- `GET /api/live/health` — aggregate operational health snapshot

Monolithic `/api/malta/live` preserved for backward compatibility.

## Phase 3 Complete — Foreign Affairs Ingestion

