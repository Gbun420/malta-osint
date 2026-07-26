export type Classification =
  | 'UNCLASSIFIED'
  | 'OFFICIAL'
  | 'CONFIDENTIAL'
  | 'SECRET';

export const CLASSIFICATIONS: readonly Classification[] = [
  'UNCLASSIFIED',
  'OFFICIAL',
  'CONFIDENTIAL',
  'SECRET',
] as const;

export type SourceType =
  | 'satellite'
  | 'drone'
  | 'live_tracks'
  | 'reports'
  | 'blue_force'
  | 'operational';

export const SOURCE_TYPES: readonly SourceType[] = [
  'satellite',
  'drone',
  'live_tracks',
  'reports',
  'blue_force',
  'operational',
] as const;

export interface Provenance {
  adapterId: string;
  sourceType: SourceType;
  originalId?: string;
  ingestedAt: string;
  pipeline: string[];
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  notes?: string;
}

export interface AuditTrail {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  history: AuditEntry[];
}

export type ReviewLevel = 'none' | 'analyst' | 'supervisor' | 'command';

export const REVIEW_LEVELS: readonly ReviewLevel[] = [
  'none',
  'analyst',
  'supervisor',
  'command',
] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

export function fail(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}