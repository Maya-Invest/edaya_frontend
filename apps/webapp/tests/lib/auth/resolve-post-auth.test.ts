import { persistPendingInviteToken } from '$lib/auth/pending-invite-token';
import { createEmptyDraft, saveDraft } from '$lib/onboarding/draft-storage';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resolvePostAuthPath } from '$lib/auth/resolve-post-auth-paths';

function mockWebStorage() {
	function createStore() {
		const store = new Map<string, string>();
		return {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		};
	}

	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: createStore(),
	});
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: createStore(),
	});
}

describe('resolvePostAuthPath', () => {
	beforeEach(() => {
		mockWebStorage();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'sessionStorage');
		Reflect.deleteProperty(globalThis, 'localStorage');
	});
	it('routes invited staff into the app instead of onboarding', () => {
		const authUserId = 'user-invited-staff';
		const draft = createEmptyDraft();
		draft.maxReachedStep = 2;
		saveDraft(authUserId, draft);

		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				grants: [],
			} as never,
			pendingOnboarding: false,
			authUserId,
			serverOnboardingStatus: {
				wizardCompleted: true,
				maxReachedStep: 4,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			},
		});

		expect(target).toBe('/dashboard');
	});

	it('routes unlinked accounts to onboarding', () => {
		expect(resolvePostAuthPath({ session: null, pendingOnboarding: true })).toBe('/onboarding?step=1');
	});

	it('routes unlinked accounts back to a pending invite before onboarding', () => {
		persistPendingInviteToken('invite-token-123');
		expect(resolvePostAuthPath({ session: null, pendingOnboarding: true })).toBe('/invite/invite-token-123');
	});

	it('routes linked accounts into the app shell', () => {
		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				grants: [],
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

	it('ignores leftover local drafts for linked staff without server wizard status', () => {
		const authUserId = 'user-leftover-draft';
		const draft = createEmptyDraft();
		draft.maxReachedStep = 2;
		saveDraft(authUserId, draft);

		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				grants: [],
			} as never,
			pendingOnboarding: false,
			authUserId,
		});

		expect(target).toBe('/dashboard');
	});

	it('routes linked accounts back to onboarding when the server wizard is incomplete', () => {
		const authUserId = 'user-incomplete';
		const draft = createEmptyDraft();
		draft.maxReachedStep = 2;
		saveDraft(authUserId, draft);

		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				grants: [],
			} as never,
			pendingOnboarding: false,
			authUserId,
			serverOnboardingStatus: {
				wizardCompleted: false,
				maxReachedStep: 2,
				schoolStepSubmitted: true,
				structureStepSubmitted: false,
			},
		});

		expect(target).toBe('/onboarding?step=2');
	});

	it('routes linked accounts into the app when backend onboarding is complete', () => {
		const target = resolvePostAuthPath({
			session: {
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				grants: [],
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

	it('routes linked teachers to login (staff webapp gate)', () => {
		const target = resolvePostAuthPath({
			session: {
				kind: 'teacher',
				actorId: 'tch1',
				schoolId: 'sch1',
				grants: [],
			} as never,
			pendingOnboarding: false,
			authUserId: 'user-teacher',
		});

		expect(target).toBe('/login');
	});

	it('routes linked guardians to login (staff webapp gate)', () => {
		const target = resolvePostAuthPath({
			session: {
				kind: 'guardian',
				actorId: 'grd1',
				schoolId: 'sch1',
				grants: [],
			} as never,
			pendingOnboarding: false,
			authUserId: 'user-guardian',
		});

		expect(target).toBe('/login');
	});
});
