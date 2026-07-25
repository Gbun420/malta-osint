<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment

- **Live site:** https://malta-osint.vercel.app
- **Host:** Vercel (migrated from Cloudflare Workers due to 1MB bundle limit)
- **Framework:** Next.js 16.2.11

# Environment Variables (set on Vercel + .env.local)

| Key | Service | Status |
|---|---|---|
| `AIS_API_KEY` | aisstream.io — live vessel tracking | ✅ Set |
| `GEMINI_API_KEY_1` | Google Gemini — AI analysis & briefing | ✅ Set |
| `FIRMS_API_KEY` | NASA FIRMS — active fire monitoring | ✅ Set (authenticated + public fallback) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis — smart system persistence | ✅ Set |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis — smart system persistence | ✅ Set |
| `VESSEL_API_KEY` | VesselAPI.com — satellite AIS fallback | ✅ Set (real API wired) |
| `OPENSKY_CLIENT_ID` | OpenSky Network — flight data (not wired yet) | ✅ Set |
| `OPENSKY_CLIENT_SECRET` | OpenSky Network — flight data (not wired yet) | ✅ Set |
| `OLLAMA_HOST` | Ollama — local LLM host | ✅ Set (http://127.0.0.1:11434) |
| `OLLAMA_MODEL` | Ollama — local model | ✅ Set (qwen3.5:4b) |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook auth | ✅ Set (random) |
| `SDK_INGEST_KEY` | SDK ingest auth | ✅ Set (random) |
| `SCANNER_URL` | Local scanner — port scanning (wired to sweep route + ngrok tunnel) | ✅ Set (dynamic — managed by launchd) |
| `SCANNER_KEY` | Local scanner auth | ✅ Set (random) |

# Local Services (LaunchAgents)

The scanner (+ ngrok tunnel) runs as a macOS LaunchAgent managed by `com.scanner.manager`:

| Service | Plist | What it does |
|---|---|---|
| Scanner + ngrok + URL sync | `~/Library/LaunchAgents/com.scanner.manager.plist` | Starts `scanner/server.js` on `:7700`, starts ngrok tunnel, gets the public URL, updates `SCANNER_URL` on Vercel, redeploys, and re-checks every 5 min for tunnel URL changes |

Scripts in `~/.local/bin/`:
- `scanner-manager.sh` — All-in-one: starts scanner, ngrok, syncs URL, redeploys, monitors
- `update-ngrok-url.sh` — Standalone URL updater (also called by manager)

> **Note:** Free ngrok URLs change on each restart. The manager auto-updates Vercel and redeploys. If you see scan data missing, check `/tmp/scanner-manager.log`.
| `ENABLE_MSS_SMART_SYSTEM_MODULE` | Smart system | ✅ Set (enabled) |

# AIS Data Pipeline

The client fetches the API key from `/api/config` (server-side), then opens a WebSocket to `wss://stream.aisstream.io/v0/stream`. Mock AIS data was removed — live data only. World-wide bounding box.

# Build & Deploy

```bash
npx next build
npx vercel --prod --yes --scope gbun420s-projects
```
