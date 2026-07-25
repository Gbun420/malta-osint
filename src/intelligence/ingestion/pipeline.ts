import type { AdapterResult } from '@/intelligence/schemas/registry';
import type { IntelligenceEvent } from '@/intelligence/types';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';
import { calculateConfidence, verificationState } from '@/intelligence/confidence';
import { calculateMaltaRelevance } from '@/intelligence/relevance';
import { classify } from '@/intelligence/classification';

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
        const enriched = result.records.map(event => {
          const classifications = classify(undefined, event.title + ' ' + (event.summary || ''));
          const cats = [...new Set([...event.categories, ...classifications.map(c => c.category)])];

          const hasConflict = result.errors.some(e => e.code === 'CONFLICTING');
          const confidence = calculateConfidence({
            evidence: [],
            hasConflictingSources: hasConflict,
            hasRetraction: false,
            eventTimeKnown: !!event.eventTime,
            geolocationInferred: event.locations.length === 0,
            sourceFreshnessMs: 0,
          });

          const relevance = calculateMaltaRelevance({
            mentionsMalta: event.title.toLowerCase().includes('malta') || event.summary.toLowerCase().includes('malta'),
            hasMalteseGovernmentLink: false,
            hasConsularImplication: false,
            hasMaltaFlaggedAsset: false,
            isEUDecisionBindingMalta: cats.includes('eu-policy'),
            centralMedProximityKm: null,
            tradeExposure: cats.includes('trade') || cats.includes('economic'),
            sanctionsExposure: cats.includes('sanctions'),
            maltaInInternationalOrg: cats.includes('multilateral'),
            humanitarianObligation: cats.includes('humanitarian'),
          });

          return {
            ...event,
            categories: cats as any,
            confidenceScore: confidence.score,
            maltaRelevanceScore: relevance,
            verificationState: verificationState(result.records.length, 1, hasConflict, false),
          };
        });

        const evidence = enriched.map(e => ({
          id: `ev-${e.id}`,
          sourceId: adapter.id,
          publisher: adapter.name,
          sourceType: 'official-primary' as const,
          url: '',
          title: e.title,
          publicationTime: e.eventTime,
          retrievalTime: new Date().toISOString(),
          language: null,
          contentHash: '',
          excerpt: e.summary.slice(0, 200),
          schemaVersion: '1',
          parserVersion: '1',
        }));

        await globalRepository.upsertEvidence(evidence);

        const withEvidence = enriched.map((e, i) => ({
          ...e,
          evidenceIds: [evidence[i]?.id].filter(Boolean),
        }));

        await globalRepository.upsertEvents(withEvidence);
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
