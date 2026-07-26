export const SMART_SYSTEM_FLAG = 'ENABLE_MSS_SMART_SYSTEM_MODULE' as const;

const TRUTHY = new Set(['1', 'true', 'yes', 'on', 'enabled']);

export function isSmartSystemEnabled(): boolean {
  const raw = process.env.ENABLE_MSS_SMART_SYSTEM_MODULE;
  if (!raw) return false;
  return TRUTHY.has(String(raw).trim().toLowerCase());
}

export function smartSystemStatusReason(): string {
  return isSmartSystemEnabled()
    ? `enabled via ${SMART_SYSTEM_FLAG}`
    : `disabled (set ${SMART_SYSTEM_FLAG}=true to enable)`;
}

export const SMART_SYSTEM_RUN_KEY_VAR = 'SMART_SYSTEM_RUN_KEY' as const;

export function isRunKeyConfigured(): boolean {
  return Boolean(process.env[SMART_SYSTEM_RUN_KEY_VAR]);
}

export function checkRunKey(provided: string | null | undefined): boolean {
  const expected = process.env[SMART_SYSTEM_RUN_KEY_VAR];
  if (!expected) return true;
  return typeof provided === 'string' && provided.length > 0 && provided === expected;
}