export interface SourceCostProfile {
  tier: 'free-keyless' | 'free-registration' | 'self-hosted' | 'optional-paid';
  requiredForCore: boolean;
  commercialRestrictions?: string;
  attributionRequired?: boolean;
}

export interface IntelligenceSourceDefinition {
  id: string;
  name: string;
  publisher: string;
  category: string;
  baseUrl: string;
  sourceType: 'official-primary' | 'official-secondary' | 'international-organisation'
    | 'established-media' | 'specialist-source' | 'aggregator' | 'user-submitted';
  enabledByDefault: boolean;
  requiredEnvironmentVariables: string[];
  pollingIntervalSeconds: number;
  requestTimeoutMs: number;
  maximumRetries: number;
  backoffStrategy: 'fixed' | 'exponential';
  expectedContentType: string[];
  stalenessThresholdSeconds: number;
  costProfile: SourceCostProfile;
  termsUrl?: string;
  licence?: string;
  attribution?: string;
  reliabilityPrior: number;
}

export type AdapterStatus =
  | 'ok' | 'empty' | 'partial' | 'unconfigured'
  | 'rate-limited' | 'error';

export interface AdapterError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface AdapterResult<T> {
  sourceId: string;
  attemptedAt: string;
  completedAt: string;
  status: AdapterStatus;
  records: T[];
  rawCount: number;
  acceptedCount: number;
  rejectedCount: number;
  deduplicatedCount: number;
  latencyMs: number;
  errors: AdapterError[];
  warnings: string[];
}

export type SourceHealthState =
  | 'healthy' | 'healthy-empty' | 'degraded' | 'stale'
  | 'rate-limited' | 'authentication-required'
  | 'unconfigured' | 'disabled' | 'error';

export interface SourceHealthRecord {
  sourceId: string;
  state: SourceHealthState;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastRecordTimestamp: string | null;
  httpStatus: number | null;
  latencyMs: number | null;
  recordsFetched: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsDeduplicated: number;
  schemaFailures: number;
  consecutiveFailures: number;
  authenticationState: 'valid' | 'invalid' | 'not-configured' | 'unknown';
  rateLimitState: 'ok' | 'approaching' | 'exceeded' | 'unknown';
  stalenessThresholdSeconds: number;
  errorMessage: string | null;
  updatedAt: string;
}
