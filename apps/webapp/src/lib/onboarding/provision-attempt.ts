import type { OnboardingDraft } from '$lib/onboarding/types';
import { buildProvisionPayload } from '$lib/onboarding/provision-payload';

const STORAGE_PREFIX = 'edaya:onboarding:provision-attempt';

export interface ProvisionAttemptIdentity {
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

export function fingerprintProvisionDraft(draft: OnboardingDraft): string {
	return JSON.stringify(buildProvisionPayload(draft));
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
): ProvisionAttemptIdentity {
	const fingerprint = fingerprintProvisionDraft(draft);
	const existing = loadProvisionAttempt(authUserId);
	if (existing && (existing.committed || existing.fingerprint === fingerprint)) {
		return existing.fingerprint === fingerprint
			? existing
			: { ...existing, fingerprint };
	}

	const next: ProvisionAttemptIdentity = {
		schoolId: crypto.randomUUID(),
		requestId: crypto.randomUUID(),
		fingerprint,
		committed: false,
		bootstrapReady: false,
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
