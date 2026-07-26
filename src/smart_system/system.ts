import type { Clock, IdGen } from './runtime';
import { systemClock, systemIdGen } from './runtime';
import type { Logger } from './logger';
import { createLogger } from './logger';

import { OntologyRepository } from './ontology/repository';

import type { IngestionRuntime } from './ingestion/ingestion_service';
import { IngestionService } from './ingestion/ingestion_service';
import { FlightsAdapter } from './ingestion/flights_adapter';
import { MaritimeAdapter } from './ingestion/maritime_adapter';
import { SatellitesAdapter } from './ingestion/satellites_adapter';
import { EarthquakesAdapter } from './ingestion/earthquakes_adapter';
import { GdeltAdapter } from './ingestion/gdelt_adapter';
import { NewsAdapter } from './ingestion/news_adapter';

import type { ModelContext, ModelOutput } from './models/base_model';
import { ModelRegistry } from './models/model_registry';
import { RiskScoringService } from './models/risk_scoring_service';

import { AssetTrackingService } from './apps/asset_tracking_service';
import { TimelineService } from './apps/timeline_service';

import { AuditLog } from './review/audit_log';
import { ReviewService } from './review/review_service';

import type { Detection, OperationalEvent } from './ontology/entities';

import type { SnapshotMeta, SnapshotStore } from './persistence/snapshot_store';
import {
  SNAPSHOT_AUDIT_CAP,
  SNAPSHOT_ENTITY_CAP,
  SNAPSHOT_REVIEW_CAP,
  createSnapshotStore,
} from './persistence/snapshot_store';

export interface SmartSystemOptions {
  clock?: Clock;
  idGen?: IdGen;
  logger?: Logger;
  snapshotStore?: SnapshotStore;
}

export interface AnalysisResult {
  recommendations: ModelOutput[];
  reviewItemIds: string[];
}

export class SmartSystem {
  readonly clock: Clock;
  readonly idGen: IdGen;
  readonly logger: Logger;

  readonly repository: OntologyRepository;
  readonly ingestion: IngestionService;
  readonly models: ModelRegistry;

  readonly risk: RiskScoringService;

  readonly assets: AssetTrackingService;
  readonly timeline: TimelineService;

  readonly auditLog: AuditLog;
  readonly review: ReviewService;

  readonly snapshotStore: SnapshotStore;
  private snapshotMeta: SnapshotMeta | null = null;

  constructor(opts: SmartSystemOptions = {}) {
    this.clock = opts.clock ?? systemClock;
    this.idGen = opts.idGen ?? systemIdGen;
    this.logger = opts.logger ?? createLogger();
    this.snapshotStore = opts.snapshotStore ?? createSnapshotStore();

    this.repository = new OntologyRepository(this.clock, this.logger);

    this.ingestion = new IngestionService({
      repository: this.repository,
      clock: this.clock,
      idGen: this.idGen,
      logger: this.logger,
    });
    this.ingestion
      .registerAdapter(new FlightsAdapter())
      .registerAdapter(new MaritimeAdapter())
      .registerAdapter(new SatellitesAdapter())
      .registerAdapter(new EarthquakesAdapter())
      .registerAdapter(new GdeltAdapter())
      .registerAdapter(new NewsAdapter());

    this.risk = new RiskScoringService();
    this.models = new ModelRegistry(this.logger);
    this.models.register(this.risk);

    this.assets = new AssetTrackingService(this.repository, this.logger);
    this.timeline = new TimelineService(this.repository);

    this.auditLog = new AuditLog(this.clock);
    this.review = new ReviewService({
      repository: this.repository,
      auditLog: this.auditLog,
      clock: this.clock,
      idGen: this.idGen,
      logger: this.logger,
    });
  }

  private modelCtx(): ModelContext {
    return { clock: this.clock, idGen: this.idGen, logger: this.logger };
  }

  get persistenceKind(): SnapshotStore['kind'] {
    return this.snapshotStore.kind;
  }

  ontologyCounts(): Record<string, number> {
    return this.snapshotMeta?.counts ?? this.repository.counts();
  }

  ontologyTotal(): number {
    return this.snapshotMeta?.total ?? this.repository.size();
  }

  async hydrate(): Promise<void> {
    try {
      const snapshot = await this.snapshotStore.load();
      if (!snapshot) return;
      this.repository.replaceAll(snapshot.entities);
      this.review.replaceItems(snapshot.reviewItems);
      this.auditLog.replaceEntries(snapshot.audit);
      this.snapshotMeta = snapshot.meta;
    } catch (err) {
      this.logger.warn('hydrate failed (continuing in-memory)', err instanceof Error ? err.message : err);
    }
  }

  async persist(): Promise<void> {
    const meta: SnapshotMeta = {
      savedAt: this.clock.iso(),
      counts: this.repository.counts(),
      total: this.repository.size(),
    };
    this.snapshotMeta = meta;
    if (this.snapshotStore.kind === 'null') return;
    try {
      await this.snapshotStore.save({
        meta,
        entities: this.repository.exportAll().slice(0, SNAPSHOT_ENTITY_CAP),
        reviewItems: this.review.exportItems().slice(0, SNAPSHOT_REVIEW_CAP),
        audit: this.auditLog.exportEntries().slice(-SNAPSHOT_AUDIT_CAP),
      });
    } catch (err) {
      this.logger.warn('persist failed (state kept in-memory)', err instanceof Error ? err.message : err);
    }
  }

  async ingest(runtime: IngestionRuntime) {
    const summary = await this.ingestion.ingestAll(runtime);
    this.auditLog.record({
      actor: 'system',
      type: 'ingestion_run',
      subjectId: 'ingestion',
      summary: `ingested ${summary.entitiesStored} entities from ${summary.adaptersRun} feed(s)`,
      details: { rawRecords: summary.rawRecords, rejected: summary.entitiesRejected },
    });
    return summary;
  }

  analyze(): AnalysisResult {
    const ctx = this.modelCtx();
    const detections = this.repository.query({ kind: 'Detection' }) as Detection[];
    const events = this.repository.query({ kind: 'OperationalEvent' }) as OperationalEvent[];

    const riskOut = this.risk.score(
      { events, detections, anomalyCount: 0 },
      ctx,
    );

    const recommendations: ModelOutput[] = [riskOut];
    const reviewItemIds = recommendations.map((r) => this.review.submit(r).id);
    return { recommendations, reviewItemIds };
  }

  async ingestAndAnalyze(runtime: IngestionRuntime): Promise<AnalysisResult> {
    await this.ingest(runtime);
    return this.analyze();
  }
}

export function createSmartSystem(opts: SmartSystemOptions = {}): SmartSystem {
  return new SmartSystem(opts);
}

let singleton: SmartSystem | null = null;

export function getSmartSystem(): SmartSystem {
  if (!singleton) singleton = createSmartSystem();
  return singleton;
}

export function resetSmartSystem(): void {
  singleton = null;
}