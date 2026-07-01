import { createEmptyDraft, saveDraft } from '$lib/onboarding/draft-storage';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resolvePostAuthPath } from './resolve-post-auth-paths';

function mockSessionStorage() {
	const store = new Map<string, string>();
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		},
	});
}

describe('resolvePostAuthPath', () => {
	beforeEach(() => {
		mockSessionStorage();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});
	it('routes unlinked accounts to onboarding', () => {
		expect(resolvePostAuthPath({ session: null, pendingOnboarding: true })).toBe('/onboarding');
	});

	it('routes linked accounts into the app shell', () => {
		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				effectiveGrants: { isElevated: true },
			} as never,
			pendingOnboarding: false,
			authUserId: 'user-complete',
		});

		const draft = createEmptyDraft();
		draft.wizardCompleted = true;
		saveDraft('user-complete', draft);

		expect(target.startsWith('/')).toBe(true);
		expect(target).not.toBe('/onboarding');
		expect(target).not.toBe('/login');
	});

	it('routes linked accounts back to onboarding when the wizard is incomplete', () => {
		const authUserId = 'user-incomplete';
		const draft = createEmptyDraft();
		draft.maxReachedStep = 2;
		saveDraft(authUserId, draft);

		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				effectiveGrants: { isElevated: true },
			} as never,
			pendingOnboarding: false,
			authUserId,
		});

		expect(target).toBe('/onboarding?step=2');
	});

	it('routes linked accounts into the app when backend onboarding is complete', () => {
		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				effectiveGrants: { isElevated: true },
			} as never,
			pendingOnboarding: false,
			authUserId: 'user-no-draft',
			serverOnboardingStatus: {
				wizardCompleted: true,
				maxReachedStep: 4,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			},
		});

		expect(target).not.toBe('/onboarding');
		expect(target).not.toBe('/login');
	});

	it('falls back to login when there is no session and no pending onboarding', () => {
		expect(resolvePostAuthPath({ session: null, pendingOnboarding: false })).toBe('/login');
	});
});
