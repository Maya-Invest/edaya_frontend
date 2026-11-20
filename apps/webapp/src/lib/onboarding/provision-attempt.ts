import type { OnboardingDraft } from '$lib/onboarding/types';
import { buildProvisionPayload } from '$lib/onboarding/provision-payload';

const STORAGE_PREFIX = 'edaya:onboarding:provision-attempt';

export interface ProvisionAttemptIdentity {
	submitted?: boolean;
	schoolId: string;
	requestId: string;
	fingerprint: string;
	committed: boolean;
	bootstrapReady: boolean;
}

function storageKey(authUserId: string): string {
	return `${STORAGE_PREFIX}:${authUserId}`;
}

function readStore(store: Storage | undefined, key: string): string | null {
	try {
		return store?.getItem(key) ?? null;
	}
	catch {
		return null;
	}
}

function writeStore(store: Storage | undefined, key: string, value: string | null): void {
	try {
		if (!store) {
			return;
		}
		if (value) {
			store.setItem(key, value);
			return;
		}
		store.removeItem(key);
	}
	catch {
		// Private mode can deny web storage.
	}
}

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseAttempt(raw: string | null): ProvisionAttemptIdentity | null {
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw) as Partial<ProvisionAttemptIdentity>;
		if (
			typeof parsed.schoolId !== 'string'
			|| typeof parsed.requestId !== 'string'
			|| typeof parsed.fingerprint !== 'string'
			|| !isUuid(parsed.schoolId)
			|| !isUuid(parsed.requestId)
		) {
			return null;
		}
		return {
			schoolId: parsed.schoolId,
			submitted: parsed.submitted ?? true,
			requestId: parsed.requestId,
			fingerprint: parsed.fingerprint,
			committed: parsed.committed === true,
			bootstrapReady: parsed.bootstrapReady === true,
		};
	}
	catch {
		return null;
	}
}

/** Normalize v7 payloads to their effective backend semantics, including the implicit CI dataset. */
export function normalizeProvisionFingerprint(fingerprint: string): string {
	try {
		const payload = JSON.parse(fingerprint);
		if (payload.structure && !payload.structure.datasetSnapshot && !payload.structure.templateSnapshots) {
			delete payload.structure.disciplineMappings;
			payload.structure.dataset ??= { id: 'ci-general-secondary', version: '1.0.0' };
		}
		const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
		return JSON.stringify(stable(payload));
	}
	catch { return fingerprint; }
}
export function fingerprintProvisionDraft(draft: OnboardingDraft): string {
	return normalizeProvisionFingerprint(JSON.stringify(buildProvisionPayload(draft)));
}
export function provisionAttemptNeedsReconciliation(authUserId: string, draft: OnboardingDraft): boolean {
	const existing = loadProvisionAttempt(authUserId);
	return Boolean(existing && existing.submitted !== false && !existing.committed && normalizeProvisionFingerprint(existing.fingerprint) !== fingerprintProvisionDraft(draft));
}

export function loadProvisionAttempt(authUserId: string | null | undefined): ProvisionAttemptIdentity | null {
	if (!authUserId) {
		return null;
	}
	const key = storageKey(authUserId);
	return parseAttempt(readStore(globalThis.localStorage, key) ?? readStore(globalThis.sessionStorage, key));
}

export function saveProvisionAttempt(authUserId: string, attempt: ProvisionAttemptIdentity): void {
	const raw = JSON.stringify(attempt);
	const key = storageKey(authUserId);
	writeStore(globalThis.sessionStorage, key, raw);
	writeStore(globalThis.localStorage, key, raw);
}

export function clearProvisionAttempt(authUserId: string | null | undefined): void {
	if (!authUserId) {
		return;
	}
	const key = storageKey(authUserId);
	writeStore(globalThis.sessionStorage, key, null);
	writeStore(globalThis.localStorage, key, null);
}

export function isProvisionAttemptCommitted(authUserId: string | null | undefined): boolean {
	return loadProvisionAttempt(authUserId)?.committed === true;
}

export function resolveProvisionAttempt(
	authUserId: string,
	draft: OnboardingDraft,
	reconciled = false,
): ProvisionAttemptIdentity {
	const fingerprint = fingerprintProvisionDraft(draft);
	const existing = loadProvisionAttempt(authUserId);
	if (existing && (existing.committed || normalizeProvisionFingerprint(existing.fingerprint) === fingerprint)) {
		const normalized = { ...existing, fingerprint: existing.committed ? existing.fingerprint : fingerprint };
		saveProvisionAttempt(authUserId, normalized);
		return normalized;
	}

	if (existing && existing.submitted !== false && !reconciled)
		throw new Error('ONBOARDING_ATTEMPT_RECONCILIATION_REQUIRED');
	const next: ProvisionAttemptIdentity = {
		// A late commit must never create a second school after reconciliation.
		schoolId: existing?.schoolId ?? crypto.randomUUID(),
		requestId: crypto.randomUUID(),
		fingerprint,
		committed: false,
		bootstrapReady: false,
		submitted: false,
	};
	saveProvisionAttempt(authUserId, next);
	return next;
}

export function markProvisionAttemptCommitted(authUserId: string, schoolId?: string): void {
	const existing = loadProvisionAttempt(authUserId);
	if (!existing) {
		return;
	}
	saveProvisionAttempt(authUserId, {
		...existing,
		...(schoolId && isUuid(schoolId) ? { schoolId } : {}),
		committed: true,
	});
}

export function markProvisionAttemptBootstrapReady(authUserId: string): void {
	const existing = loadProvisionAttempt(authUserId);
	if (!existing?.committed) {
		return;
	}
	saveProvisionAttempt(authUserId, {
		...existing,
		bootstrapReady: true,
	});
}

export function isProvisionAttemptBootstrapReady(authUserId: string | null | undefined): boolean {
	const existing = loadProvisionAttempt(authUserId);
	return existing?.committed === true && existing.bootstrapReady === true;
}
