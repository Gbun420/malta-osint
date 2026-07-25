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

### Adapters (all registered in source-registry, runnable from `runIngestion()`)

| Adapter | Feed URL | Status |
|---------|----------|--------|
| `council-eu-rss` | `https://ec.europa.eu/commission/presscorner/api/rss?language=en` | ✅ healthy, 10 events/run |
| `eeas` | presscorner RSS filtered `EXTERNAL_RELATIONS` + `TRADE` | ✅ healthy, 20 events/run |
| `un-news` | `news.un.org` main + peace/security + humanitarian | ⚠️ 1/3 feeds parse, 30 events on main feed |
| `gdacs` | `https://www.gdacs.org/rss.aspx` | ✅ healthy, 1+ events |
| `reliefweb` | `https://api.reliefweb.int/v2/reports?appname=$RELIEFWEB_APP_NAME` | 🔲 `RELIEFWEB_APP_NAME` not set (graceful degrade) |

### Pipeline
- `src/intelligence/ingestion/pipeline.ts` — composable runner; each adapter upserts evidence + events + source-health in one pass
- **Deterministic IDs use `sha256(link).slice(0, 20)`** (replaced base64 truncation which collapsed all EC presscorner URLs onto one ID)
- `POST /api/intelligence/ingest/run` — runs all enabled adapters, writes to Redis-backed repository, returns per-source accepted counts and totals

### Intelligence API
- `GET /api/intelligence/events` (filters: countries, categories, minSeverity, minConfidence, minMaltaRelevance, status, timeFrom, timeTo, limit, offset)
- `GET /api/intelligence/events/[id]` — single event detail
- `GET /api/intelligence/brief?maxItems=20&minRelevance=0&minConfidence=0&categories=...&since=ISO`
- `GET /api/intelligence/countries` (stub — Phase 4+)
- `GET /api/intelligence/eu` (stub)
- `GET /api/intelligence/economic` (stub)
- `GET /api/intelligence/source-health` — registry merged with persisted health records (state, latency, errors, accepts)

### Redis Persistence
- `RedisRepository` selected when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set at request time (lazy Proxy avoids Next.js serverless build-time env-var deadlocks)
- All reads handle `@upstash/redis` automatic JSON parsing (treats parsed objects and raw strings uniformly)
- Confirmed end-to-end persistence across separate POST/GET serverless invocations

### Verified Production State
- Ingest POST → returns 61 accepted across 5 sources
- Subsequent GET on events → returns 54 persisted events (after deterministic-ID overlaps)
- Source-health GET → returns real-time health snapshot for all 5 adapters
- Brief GET → returns ranked Minister's Brief items with `whyItMattersToMalta`

## Known Limitations (Phase 3)
- `RELIEFWEB_APP_NAME` env var not set — ReliefWeb adapter returns `unconfigured` cleanly
- 2 of 3 UN News sub-feeds return HTML/non-RSS — main `news.un.org` RSS works
- No deduplication across adapters — different IDs for same story from two EU sources

## Cleanup and Foundation Fixes (July 25)
Removed duplicate, broken, and mock code that conflicted with the canonical architecture:

- Deleted `src/lib/data-sources/registry.ts` — duplicate registry with incompatible source IDs; canonical registry is `SOURCE_REGISTRY` at `src/intelligence/schemas/source-registry.ts`
- Deleted `src/routes/health-data-sources.ts` — broken Express router (unused, references deleted registry)
- Deleted `src/routes/health.ts` — broken Express router (missing `@types/express`, references deleted registry)
- Deleted `src/intelligence/scripts/test-redis.ts`, `check-redis.ts`, `check-redis-health.ts` — mock/test scripts violating the "no mock data" principle of the directive
- Fixed type error in `src/lib/data-health/index.ts` — removed erroneous `stalenessThresholdSeconds` field that was incorrectly passed to `createSourceHealthRecord()` (that function reads it from the source definition internally)

No remaining references to deleted files exist in the codebase.

