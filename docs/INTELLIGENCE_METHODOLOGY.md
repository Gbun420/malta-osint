# Intelligence Methodology

## Evidence Hierarchy

| Source Type | Prior Reliability |
|-------------|-----------------|
| Official primary legal or government record | 0.95 |
| Official international-organisation record | 0.92 |
| Official government press statement | 0.88 |
| Multiple established independent media reports | 0.82 |
| Single established media report | 0.75 |
| Specialist technical source | 0.70 |
| Structured news/event aggregator | 0.60 |
| Unverified public claim | 0.45 |
| Anonymous unsupported claim | 0.20 |

## Confidence Calculation

```
confidence =
  sourceAuthority * 0.35 +
  independentCorroboration * 0.25 +
  evidenceCompleteness * 0.15 +
  temporalConsistency * 0.10 +
  geographicConsistency * 0.05 +
  sourceFreshness * 0.10
```

Penalties: -20 conflicting accounts, -15 stale source, -15 aggregator-only, -10 unclear time, -10 inferred geolocation, -25 retraction.

## Confidence Labels

| Range | Label |
|-------|-------|
| 90-100 | Confirmed |
| 75-89 | High |
| 55-74 | Moderate |
| 30-54 | Low |
| 0-29 | Unverified |

## Malta Relevance Scoring

Factors: direct Malta mention (0-25), Maltese gov/mission (0-20), consular (0-15), Malta-flagged/aviation (0-15), EU decision binding Malta (0-10), Central Med proximity (0-10), trade/energy exposure (0-10), sanctions exposure (0-10), IO where Malta acts (0-5), humanitarian obligation (0-5).

Bands: 80-100 Immediate, 60-79 High, 40-59 Monitor, 20-39 Background, 0-19 General.

## Classification

Categories are assigned via source-native categories first, then deterministic keyword rules, then optional AI.

## Contradiction Handling

Claims are stored per-event with supporting/contradicting evidence counts. Conflicting claims are displayed explicitly — not merged.
