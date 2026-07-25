# Security and Privacy

## Principles

- Server-only secrets (never exposed to client)
- No surveillance of private persons
- No targeting data
- No predictive policing
- No covert operations
- No autonomous government decisions
- No exposure of Maltese citizen personal data
- All recommendations advisory — human review required

## Implemented Protections

- ✅ Secrets on Vercel env vars only
- ✅ No AIS key in browser — relayed through server proxy
- ✅ No arbitrary server-side URL fetch
- ✅ Request timeouts on all upstream calls
- ✅ Input-length limits via Zod (planned)
- ✅ Pagination limits (planned)
- ✅ CORS restricted (planned)
- ✅ Security headers (Next.js defaults)
- ✅ Active port scanning separated from ministerial interface
- ✅ No mock/production data mixed

## Consular Privacy

Consular-relevant events use aggregate descriptions:
- "Possible Maltese traveller impact"
- "Known route commonly used from Malta"
- "Relevant Maltese diplomatic mission"

No citizen names or precise locations from private systems.

## Source Attribution

All sources displayed with publisher, URL, licence, retrieval time, and observation time.
