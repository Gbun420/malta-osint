import { createHash } from 'crypto';
import type { AdapterResult } from '@/intelligence/schemas/registry';
import type { IntelligenceEvent, EvidenceRecord } from '@/intelligence/types';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';
import { calculateConfidence, verificationState } from '@/intelligence/confidence';
import { calculateMaltaRelevance } from '@/intelligence/relevance';
import { classify } from '@/intelligence/classification';
import { validateBatch, type ValidationIssue } from '@/intelligence/validation';
import { deduplicate } from '@/intelligence/deduplication';
import { correlateEvents } from '@/intelligence/correlation';

import { fetchCouncilEU } from '@/intelligence/adapters/official/council-eu';
import { fetchEEAS } from '@/intelligence/adapters/official/eeas';
import { fetchUNNews } from '@/intelligence/adapters/official/un-news';
import { fetchGDACS } from '@/intelligence/adapters/humanitarian/gdacs';
import { fetchReliefWeb } from '@/intelligence/adapters/humanitarian/reliefweb';

export type AdapterFactory = () => Promise<AdapterResult<IntelligenceEvent>>;

interface AdapterEntry {
  id: string;
  name: string;
  factory: AdapterFactory;
  enabled: boolean;
}

const ADAPTERS: AdapterEntry[] = [
  { id: 'council-eu-rss', name: 'Council of the EU', factory: fetchCouncilEU, enabled: true },
  { id: 'eeas', name: 'EEAS', factory: fetchEEAS, enabled: true },
  { id: 'un-news', name: 'UN News', factory: fetchUNNews, enabled: true },
  { id: 'gdacs', name: 'GDACS', factory: fetchGDACS, enabled: true },
  { id: 'reliefweb', name: 'ReliefWeb', factory: fetchReliefWeb, enabled: true },
];

export async function runIngestion(sourceId?: string): Promise<{
  results: { sourceId: string; status: string; acceptedCount: number; error?: string }[];
  totalAccepted: number;
}> {
  const adapters = sourceId
    ? ADAPTERS.filter(a => a.id === sourceId)
    : ADAPTERS;

  const results: { sourceId: string; status: string; acceptedCount: number; error?: string }[] = [];
  let totalAccepted = 0;

  for (const adapter of adapters) {
    if (!adapter.enabled) {
      results.push({ sourceId: adapter.id, status: 'disabled', acceptedCount: 0 });
      continue;
    }

    try {
      const result = await adapter.factory();

      if (result.records.length > 0) {
        const hasConflict = result.errors.some(e => e.code === 'CONFLICTING');

        const evidence: EvidenceRecord[] = result.records.map(event => ({
          id: `ev-${event.id}`,
          sourceId: adapter.id,
          publisher: adapter.name,
          sourceType: 'official-primary' as const,
          url: (event as any).sourceUrl || '',
          title: event.title,
          publicationTime: event.eventTime,
          retrievalTime: new Date().toISOString(),
          language: null,
          contentHash: createHash('sha256').update(event.title + (event.summary || '')).digest('hex').slice(0, 16),
          excerpt: (event.summary || '').slice(0, 200),
          schemaVersion: '1',
          parserVersion: '1',
        }));

        await globalRepository.upsertEvidence(evidence);

        const enriched = result.records.map((event, i) => {
          const classifications = classify(undefined, event.title + ' ' + (event.summary || ''));
          const cats = [...new Set([...event.categories, ...classifications.map(c => c.category)])];

          const eventEvidence = evidence[i] ? [evidence[i]] : [];

          const freshness = event.eventTime
            ? Math.max(0, Date.now() - new Date(event.eventTime).getTime())
            : 0;

          const confidence = calculateConfidence({
            evidence: eventEvidence,
            hasConflictingSources: hasConflict,
            hasRetraction: false,
            eventTimeKnown: !!event.eventTime,
            geolocationInferred: event.locations.length === 0,
            sourceFreshnessMs: freshness,
          });

          const relevanceResult = calculateMaltaRelevance({
            mentionsMalta: event.title.toLowerCase().includes('malta') || event.summary.toLowerCase().includes('malta'),
            hasMalteseGovernmentLink: false,
            hasEmbassyInvolvement: false,
            citizensAffected: false,
            hasMaltaFlaggedAsset: false,
            maltaAviationImpact: false,
            hasConsularImplication: false,
            isEUDecisionBindingMalta: cats.includes('eu-policy'),
            centralMedProximityKm: null,
            tradeExposure: cats.includes('trade') || cats.includes('economic'),
            energyExposure: cats.includes('energy'),
            sanctionsExposure: cats.includes('sanctions'),
            humanitarianObligation: cats.includes('humanitarian'),
            maltaInInternationalOrg: cats.includes('multilateral'),
            priorityCountryRelation: false,
            reputationalImpact: false,
          });

          return {
            ...event,
            categories: cats as any,
            confidenceScore: confidence.score,
            maltaRelevanceScore: relevanceResult.score,
            relevanceFactors: relevanceResult.factors.map(f => ({ key: f.key, label: f.label, points: f.points })),
            verificationState: verificationState(eventEvidence.length, event.officialSourceCount || 1, hasConflict, false),
            evidenceIds: [evidence[i]?.id].filter(Boolean),
          };
        });

        const { valid, invalid } = validateBatch(enriched);
        if (invalid.length > 0) {
          result.rejectedCount += invalid.length;
        }

        const { events: deduped, duplicatesRemoved } = deduplicate(valid);
        result.deduplicatedCount += duplicatesRemoved;

        const correlations = correlateEvents(deduped);
        for (const corr of correlations) {
          for (const eid of corr.eventIds) {
            const ev = deduped.find(e => e.id === eid);
            if (ev) {
              if (!ev.relatedEventIds) ev.relatedEventIds = [];
              for (const otherId of corr.eventIds) {
                if (otherId !== eid && !ev.relatedEventIds.includes(otherId)) {
                  ev.relatedEventIds.push(otherId);
                }
              }
            }
          }
        }

        await globalRepository.upsertEvents(deduped);
      }

      const healthRecord = createSourceHealthRecord({
        sourceId: adapter.id,
        lastAttemptAt: result.attemptedAt,
        lastSuccessAt: result.status === 'ok' || result.status === 'partial' ? result.completedAt : null,
        lastRecordTimestamp: result.records.length > 0 ? new Date().toISOString() : null,
        httpStatus: result.errors.length > 0 ? 500 : 200,
        latencyMs: result.latencyMs,
        recordsFetched: result.rawCount,
        recordsAccepted: result.acceptedCount,
        recordsRejected: result.rejectedCount,
        recordsDeduplicated: result.deduplicatedCount,
        schemaFailures: 0,
        consecutiveFailures: result.errors.length > 0 ? 1 : 0,
        authenticationState: 'valid',
        rateLimitState: 'ok',
        errorMessage: result.errors.map(e => e.message).join('; ') || null,
      });
      await globalRepository.updateSourceHealth(healthRecord);

      results.push({
        sourceId: adapter.id,
        status: healthRecord.state,
        acceptedCount: result.acceptedCount,
      });
      totalAccepted += result.acceptedCount;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ sourceId: adapter.id, status: 'error', acceptedCount: 0, error: msg });

      const healthRecord = createSourceHealthRecord({
        sourceId: adapter.id,
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: null,
        lastRecordTimestamp: null,
        httpStatus: 500,
        latencyMs: 0,
        recordsFetched: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        recordsDeduplicated: 0,
        schemaFailures: 1,
        consecutiveFailures: 1,
        authenticationState: 'unknown',
        rateLimitState: 'unknown',
        errorMessage: msg,
      });
      await globalRepository.updateSourceHealth(healthRecord);
    }
  }

  return { results, totalAccepted };
}
