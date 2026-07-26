import { describe, expect, it } from 'vitest';
import { RiskScoringService } from '../models/risk_scoring_service';
import type { ModelContext } from '../models/base_model';
import { deterministic, makeDetection } from './helpers';

function ctx(): ModelContext {
  return deterministic();
}

describe('models produce explainable, advisory recommendations', () => {
  it('risk service produces an explainable, bounded score', () => {
    const out = new RiskScoringService().score(
      { events: [], detections: [makeDetection('d', 'aircraft', 1, 1)], anomalyCount: 1 },
      ctx(),
    );
    expect(out.recommendation.score).toBeGreaterThanOrEqual(0);
    expect(out.recommendation.score).toBeLessThanOrEqual(1);
    expect(out.recommendation.factors.length).toBeGreaterThan(0);
    expect(out.recommendation.confidenceExplanation).toContain('Confidence');
  });
});