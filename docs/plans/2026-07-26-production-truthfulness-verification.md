# Production Truthfulness and Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make runtime status and loading states truthful, repair broken route/data consumption, establish browser regression coverage, and verify Preview before any production promotion.

**Architecture:** Treat each feed as an independently observable component. The shell will consume a safe aggregate health endpoint rather than claiming global availability, pages will consume canonical API envelopes with bounded timeouts, and the persistent AIS worker will expose connection/message/storage state rather than process-only health. Playwright will cover populated, empty, and failed-source behavior.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Vitest, Playwright, Upstash Redis, optional Supabase-backed AIS worker.

---

### Task 1: Preserve the production baseline

**Files:**
- Create: `output/playwright/production-*.png`
- Create: `output/verification/production-baseline.json`

1. Record the current commit, Vercel environment-variable presence, API status/content type/latency/counts, route text, console errors, network failures, and screenshots.
2. Record local AIS process, health response, logs, configuration presence, and record freshness without secret values.
3. Classify every zero or loading state as real-empty, unconfigured, failed, rate-limited, malformed, parsing, stale, or pending.

### Task 2: Add browser regression coverage

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/runtime-truthfulness.spec.ts`

1. Add Playwright and explicit `typecheck`, integration, and E2E scripts.
2. Write failing assertions for shell layout/navigation, missing routes, truthful status, populated API fixtures, unavailable sources, duplicate suppression, and loading-state exits.
3. Run the tests and retain the expected failing output before implementation.

### Task 3: Repair canonical source-health consumption

**Files:**
- Modify: `src/services/intelligence/sourcesService.ts`
- Modify: `src/app/(intelligence)/sources/page.tsx`
- Test: `src/services/intelligence/__tests__/sourcesService.test.ts`

1. Write failing envelope parsing and error-state tests.
2. Replace synthetic browser-side health probes with `/api/intelligence/source-health`.
3. Ensure every request exits loading and distinguishes unavailable, unconfigured, stale, degraded, and healthy-empty.

### Task 4: Remove false global status

**Files:**
- Modify: `src/components/intelligence/ApplicationShell.tsx`
- Modify: `src/components/intelligence/CommandHeader.tsx`
- Create: `src/components/intelligence/RuntimeHealth.tsx`
- Test: `tests/e2e/runtime-truthfulness.spec.ts`

1. Add failing UI assertions for mixed/failed component states.
2. Render aggregate wording derived from required-feed health.
3. Remove hard-coded global “Operational” and static “Live” labels.

### Task 5: Repair pages and navigation

**Files:**
- Modify: `src/components/intelligence/Sidebar.tsx`
- Create: `src/app/(intelligence)/settings/page.tsx`
- Create: `src/app/(intelligence)/api-docs/page.tsx`
- Modify: `src/app/(intelligence)/aviation/page.tsx`
- Modify: `src/app/(intelligence)/brief/page.tsx`
- Modify: `src/app/(intelligence)/events/page.tsx`
- Modify: `src/app/(intelligence)/sanctions/page.tsx`
- Test: `tests/e2e/runtime-truthfulness.spec.ts`

1. Add failing route/navigation and loading-exit assertions.
2. Add the requested routes or canonical redirects without broken prefetches.
3. Add bounded API timeouts/retry behavior and distinguish unavailable from zero.
4. Suppress duplicate event/brief records using canonical identity.

### Task 6: Make AIS worker health factual

**Files:**
- Modify: `ais-worker/src/health.ts`
- Modify: `ais-worker/src/index.ts`
- Modify: `ais-worker/src/config.ts`
- Modify: `src/app/api/ais/vessels/route.ts`
- Test: `ais-worker/src/health.test.ts`

1. Write failing health assertions for disconnected, rate-limited, no-message, storage-disabled, stale, and live states.
2. Expose worker connection, last-message, received/stored/error counters, and persistence configuration.
3. Stop equating upstream request completion with a connected live stream.
4. Package documented always-on deployment configuration; do not imply Vercel runs the worker.

### Task 7: Run local verification

1. Run lint, typecheck, unit tests, integration tests, Playwright tests, and production build with recorded exit codes.
2. Start the built application on an available port and audit every requested route/API.
3. Record screenshots, console errors, failed requests, counts, timestamps, and remaining failures.

### Task 8: Preview gate

1. Ensure required Preview environment names are present without displaying values.
2. Deploy to Vercel Preview.
3. Run the full Playwright and API audit against the actual Preview URL.
4. Stop and report failures if any required gate fails.

### Task 9: Production promotion and evidence

1. Promote only a Preview that satisfies the gates.
2. Repeat route/API/browser verification against `https://malta-osint.vercel.app/`.
3. Report commit hash, URLs/timestamps, commands/exit codes, screenshots, counts, last ingestion timestamps, worker process health, and all remaining failures.
