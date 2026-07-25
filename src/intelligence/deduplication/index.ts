import type { IntelligenceEvent } from '@/intelligence/types';

export interface DedupResult {
  events: IntelligenceEvent[];
  duplicatesRemoved: number;
  clustersFormed: number;
}

export interface Cluster {
  canonicalKey: string;
  events: IntelligenceEvent[];
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function exactDuplicate(a: IntelligenceEvent, b: IntelligenceEvent): boolean {
  if (a.canonicalKey && b.canonicalKey && a.canonicalKey === b.canonicalKey) return true;
  if (a.id === b.id) return true;
  return false;
}

export function probableDuplicate(a: IntelligenceEvent, b: IntelligenceEvent): boolean {
  const aNorm = normalizeText(a.title);
  const bNorm = normalizeText(b.title);
  if (aNorm === bNorm && aNorm.length > 10) return true;

  if (a.eventTime && b.eventTime && a.eventTime === b.eventTime) {
    const aCats = new Set(a.categories);
    const bCats = new Set(b.categories);
    const overlap = [...aCats].some(c => bCats.has(c));
    if (overlap && a.countries.length > 0 && b.countries.length > 0) {
      const aCountries = new Set(a.countries.map(c => c.alpha2));
      const bCountries = new Set(b.countries.map(c => c.alpha2));
      const countryOverlap = [...aCountries].some(c => bCountries.has(c));
      if (countryOverlap) return true;
    }
  }

  return false;
}

export function clusterEvents(events: IntelligenceEvent[]): Cluster[] {
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    if (assigned.has(events[i].id)) continue;

    const cluster: Cluster = {
      canonicalKey: events[i].canonicalKey || events[i].id,
      events: [events[i]],
    };
    assigned.add(events[i].id);

    for (let j = i + 1; j < events.length; j++) {
      if (assigned.has(events[j].id)) continue;

      if (exactDuplicate(events[i], events[j]) || probableDuplicate(events[i], events[j])) {
        cluster.events.push(events[j]);
        assigned.add(events[j].id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

export function deduplicate(events: IntelligenceEvent[]): DedupResult {
  const clusters = clusterEvents(events);
  const result: IntelligenceEvent[] = [];
  let duplicatesRemoved = 0;

  for (const cluster of clusters) {
    if (cluster.events.length === 1) {
      result.push(cluster.events[0]);
      continue;
    }

    const primary = cluster.events.reduce((best, current) => {
      if (current.verificationState === 'official-confirmation') return current;
      if (best.verificationState === 'official-confirmation') return best;
      if (current.sourceCount > best.sourceCount) return current;
      return best;
    }, cluster.events[0]);

    const allEvidenceIds = new Set<string>();
    const allClaimIds = new Set<string>();
    const allCountries = new Map<string, typeof primary.countries[0]>();
    const allLocations = new Set<string>();

    for (const ev of cluster.events) {
      ev.evidenceIds.forEach(id => allEvidenceIds.add(id));
      ev.claimIds.forEach(id => allClaimIds.add(id));
      ev.countries.forEach(c => allCountries.set(c.alpha2, c));
      ev.locations.forEach(l => allLocations.add(`${l.lat},${l.lng}`));
    }

    const merged: IntelligenceEvent = {
      ...primary,
      id: primary.id,
      canonicalKey: cluster.canonicalKey,
      evidenceIds: [...allEvidenceIds],
      claimIds: [...allClaimIds],
      countries: [...allCountries.values()],
      locations: primary.locations,
      sourceCount: cluster.events.reduce((sum, e) => sum + e.sourceCount, 0),
      officialSourceCount: cluster.events.reduce((sum, e) => sum + e.officialSourceCount, 0),
      verificationState: cluster.events.some(e => e.verificationState === 'conflicting')
        ? 'conflicting'
        : primary.verificationState,
      lastObservedAt: cluster.events.reduce((latest, e) =>
        new Date(e.lastObservedAt) > new Date(latest) ? e.lastObservedAt : latest
      , primary.lastObservedAt),
      updatedAt: new Date().toISOString(),
    };

    result.push(merged);
    duplicatesRemoved += cluster.events.length - 1;
  }

  return {
    events: result,
    duplicatesRemoved,
    clustersFormed: clusters.length,
  };
}