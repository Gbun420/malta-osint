/**
 * End-to-end integration: ingestion → ontology → model recommendation → human
 * review → audit. Uses an injected fetch double (real-shaped data), so no
 * network and no fabricated app data.
 */

import { describe, expect, it } from 'vitest';
import { createSmartSystem } from '../system';
import { deterministic, fakeFetchJson } from './helpers';

describe('integration: ingest → ontology → models → human review', () => {
  it('runs the full advisory pipeline and records decisions', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });

    const ingestion = await ss.ingest({ baseUrl: 'http://test.local', fetchJson: fakeFetchJson() });
    expect(ingestion.entitiesStored).toBeGreaterThan(0);
    expect(ss.repository.size()).toBe(ingestion.entitiesStored);

    const analysis = ss.analyze();
    expect(analysis.recommendations.length).toBe(1);
    expect(analysis.recommendations[0].advisoryOnly === true).toBe(true);
    expect(ss.review.queue().length).toBe(1);

    const queue = ss.review.queue();
    ss.review.decide(queue[0].id, { decidedBy: 'analyst-1', decision: 'approve', rationale: 'concur' });

    expect(ss.review.queue().length).toBe(0);

    expect(ss.auditLog.query({ type: 'ingestion_run' }).length).toBe(1);
    expect(ss.auditLog.query({ type: 'recommendation_submitted' }).length).toBe(1);
    expect(ss.auditLog.query({ type: 'review_decided' }).length).toBe(1);

    expect(ss.repository.counts().HumanReviewDecision).toBe(1);
  });

  it('operational apps read real ingested data', async () => {
    const { clock, idGen, logger } = deterministic();
    const ss = createSmartSystem({ clock, idGen, logger });
    await ss.ingest({ baseUrl: 'http://test.local', fetchJson: fakeFetchJson() });

    const visibility = ss.assets.visibility();
    expect(visibility.totalTracks).toBe(5);
    expect(visibility.drones).toHaveLength(0);
    expect(visibility.friendlyUnits).toHaveLength(0);

    const timeline = ss.timeline.build();
    expect(timeline.entries.length).toBe(3);
  });
});