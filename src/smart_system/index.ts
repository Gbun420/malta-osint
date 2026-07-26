export {
  SMART_SYSTEM_FLAG,
  isSmartSystemEnabled,
  smartSystemStatusReason,
  isRunKeyConfigured,
  checkRunKey,
} from './config';
export { createSmartSystem, getSmartSystem, resetSmartSystem, SmartSystem } from './system';
export type { SmartSystemOptions, AnalysisResult } from './system';

export type {
  Classification,
  SourceType,
  Provenance,
  AuditTrail,
  ReviewLevel,
  ValidationResult,
} from './types';
export type {
  AnyEntity,
  EntityKind,
  Detection,
  SatelliteImage,
  AreaOfInterest,
  DroneAsset,
  Unit,
  Task,
  CourseOfAction,
  IntelligenceReport,
  OperationalEvent,
  HumanReviewDecision,
  HumanDecision,
} from './ontology/entities';
export type { ModelOutput } from './models/base_model';
export type { ReviewItem, ReviewStatus } from './review/review_service';
export type { AuditLogEntry } from './review/audit_log';
export type { IngestionRuntime } from './ingestion/ingestion_service';