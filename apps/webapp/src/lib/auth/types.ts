import type { components } from '$lib/api/schema';

export type SessionSnapshot = components['schemas']['EffectiveGrantsResponse'];
export type ActionGrantsSnapshot = SessionSnapshot['grants'];
export type ActionGrantSnapshot = ActionGrantsSnapshot[number];
export type PermissionCode = ActionGrantSnapshot['permission'];
