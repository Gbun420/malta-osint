# Deployment — Free Tier

## Current Stack

- **Hosting:** Vercel Hobby (free)
- **Domain:** vercel.app (free)
- **Database:** Upstash Redis (free tier) for caching
- **AI:** Google Gemini (free quota)
- **Map tiles:** CartoCDN (free, attribution required)
- **Flight data:** ADSB.lol (free, ODbL)
- **Seismic data:** USGS (free, public domain)
- **Fire data:** NASA FIRMS (free registration)
- **Marine data:** Open-Meteo (free, attribution)
- **AIS relay:** local machine + ngrok (free tier, URL changes on restart)

## What Would Require Payment

- Paid news API (not used — RSS only)
- Paid AIS history (not used — live streaming only)
- Paid satellite imagery (not used)
- Paid sanctions database (not used — official EU/UN lists only)
- Paid database (not used — Redis free tier sufficient for prototype)

## AIS Relay Architecture

AISstream WebSocket connects from a local machine running `scanner/server.js`. A ngrok tunnel exposes port 7700. The public URL is synced to Vercel env var `SCANNER_URL` via launchd manager.

All upstream API keys are server-side only (Vercel environment variables).
