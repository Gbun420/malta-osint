import type { IntelligenceEvent } from '@/intelligence/types';

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export function validateEvent(event: IntelligenceEvent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!event.id || event.id.length < 5) {
    issues.push({ field: 'id', severity: 'error', message: 'Event id is missing or too short' });
  }
  if (!event.canonicalKey || event.canonicalKey.length < 5) {
    issues.push({ field: 'canonicalKey', severity: 'error', message: 'canonicalKey is missing or too short' });
  }
  if (!event.title || event.title.trim().length === 0) {
    issues.push({ field: 'title', severity: 'error', message: 'Title is empty' });
  }
  if (event.title && event.title.length > 500) {
    issues.push({ field: 'title', severity: 'warning', message: 'Title exceeds 500 characters' });
  }
  if (!event.categories || event.categories.length === 0) {
    issues.push({ field: 'categories', severity: 'warning', message: 'No categories assigned' });
  }
  if (event.severity < 0 || event.severity > 5) {
    issues.push({ field: 'severity', severity: 'error', message: 'Severity must be between 0 and 5' });
  }
  if (event.confidenceScore < 0 || event.confidenceScore > 100) {
    issues.push({ field: 'confidenceScore', severity: 'error', message: 'confidenceScore must be between 0 and 100' });
  }
  if (event.maltaRelevanceScore < 0 || event.maltaRelevanceScore > 100) {
    issues.push({ field: 'maltaRelevanceScore', severity: 'error', message: 'maltaRelevanceScore must be between 0 and 100' });
  }
  if (!event.firstObservedAt) {
    issues.push({ field: 'firstObservedAt', severity: 'error', message: 'firstObservedAt is missing' });
  }
  if (!event.lastObservedAt) {
    issues.push({ field: 'lastObservedAt', severity: 'error', message: 'lastObservedAt is missing' });
  }
  if (!event.ingestedAt) {
    issues.push({ field: 'ingestedAt', severity: 'error', message: 'ingestedAt is missing' });
  }
  if (event.eventTime && isNaN(new Date(event.eventTime).getTime())) {
    issues.push({ field: 'eventTime', severity: 'warning', message: 'eventTime is not a valid date' });
  }
  if (event.countries) {
    for (const c of event.countries) {
      if (!c.alpha2 || c.alpha2.length !== 2) {
        issues.push({ field: 'countries', severity: 'warning', message: `Invalid country code: ${c.alpha2}` });
      }
    }
  }
  if (event.locations) {
    for (const l of event.locations) {
      if (l.lat < -90 || l.lat > 90) {
        issues.push({ field: 'locations', severity: 'error', message: `Latitude out of range: ${l.lat}` });
      }
      if (l.lng < -180 || l.lng > 180) {
        issues.push({ field: 'locations', severity: 'error', message: `Longitude out of range: ${l.lng}` });
      }
    }
  }

  return issues;
}

export function validateBatch(events: IntelligenceEvent[]): {
  valid: IntelligenceEvent[];
  invalid: Array<{ event: IntelligenceEvent; issues: ValidationIssue[] }>;
} {
  const valid: IntelligenceEvent[] = [];
  const invalid: Array<{ event: IntelligenceEvent; issues: ValidationIssue[] }> = [];

  for (const event of events) {
    const issues = validateEvent(event);
    if (issues.some(i => i.severity === 'error')) {
      invalid.push({ event, issues });
    } else {
      valid.push(event);
    }
  }

  return { valid, invalid };
}