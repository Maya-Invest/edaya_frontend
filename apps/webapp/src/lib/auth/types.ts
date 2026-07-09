import type { components } from '$lib/api/schema';

export type SessionSnapshot = components['schemas']['EffectiveGrantsResponse'];
export type EffectiveGrantsSnapshot = SessionSnapshot['effectiveGrants'];
export type ScopeGrantSnapshot = EffectiveGrantsSnapshot['scopeGrants'][number];
export type PermissionCode = ScopeGrantSnapshot['permission'];
