import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { ApiError } from '@maya-invest/edaya-api-client';

const profiles = mock(async () => ({ profiles: [] as unknown[] }));
const effectiveGrants = mock(async () => ({
	kind: 'staff',
	actorId: 'st1',
	schoolId: 'sch1',
	assuranceLevel: 'verified',
	grants: [{ source: 'owner' }],
}));

mock.module('$lib/api/school-client', () => ({
	getBrowserSchoolClient: () => ({
		authorization: { profiles, effectiveGrants },
	}),
}));

mock.module('$lib/api/staff-data', () => ({
	fetchSessionStaffProfile: async () => ({
		profile: { subjectId: 'user-1', name: 'Staff' },
		notificationEmail: null,
		notificationPhone: null,
	}),
}));

mock.module('$lib/onboarding/sync-account-status', () => ({
	fetchServerOnboardingAccountStatus: async () => ({
		wizardCompleted: true,
		maxReachedStep: 4,
		schoolStepSubmitted: true,
		structureStepSubmitted: true,
	}),
}));

const authSession = {
	isLoggedIn: false,
	ready: true,
	staffMemberships: [] as unknown[],
	schoolId: null as string | null,
	sessionKind: null as string | null,
	userId: null as string | null,
	needsOnboarding: false,
	serverOnboardingStatus: null as unknown,
	markLoading() {
		this.ready = false;
	},
	markReady() {
		this.ready = true;
	},
	clear: mock(() => {
		this.isLoggedIn = false;
		this.staffMemberships = [];
		this.needsOnboarding = false;
	}),
	setAuthAccountOnly: mock(() => {}),
	setStaffMemberships: mock((memberships: unknown[]) => {
		authSession.staffMemberships = memberships;
	}),
	selectStaffMembership: mock((membership: { schoolId: string; actorId: string }) => {
		authSession.sessionKind = 'staff';
		authSession.schoolId = membership.schoolId;
		authSession.userId = membership.actorId;
		authSession.needsOnboarding = false;
	}),
	setPendingOnboarding: mock(() => {
		authSession.needsOnboarding = true;
		authSession.isLoggedIn = false;
	}),
	setFromServer: mock((session: { actorId: string; schoolId: string; kind: string } | null) => {
		if (!session) {
			authSession.isLoggedIn = false;
			return;
		}
		authSession.isLoggedIn = true;
		authSession.needsOnboarding = false;
		authSession.sessionKind = session.kind;
		authSession.schoolId = session.schoolId;
		authSession.userId = session.actorId;
	}),
	setServerOnboardingStatus: mock((status: unknown) => {
		authSession.serverOnboardingStatus = status;
	}),
	setOnboardingStatusUnknown: mock(() => {}),
};

mock.module('$lib/auth/session.svelte', () => ({
	authSession,
}));

let getSessionImpl: () => Promise<{ data: { session: unknown; user: unknown } }> = async () => ({
	data: { session: { id: 's1' }, user: { id: 'user-1', email: 'staff@school.edu' } },
});

mock.module('$lib/auth/client', () => ({
	authClient: {
		getSession: () => getSessionImpl(),
	},
}));

const { bootstrapSession, resetBootstrapSession } = await import('$lib/auth/bootstrap');

describe('bootstrapSession linked-staff routing', () => {
	beforeEach(() => {
		resetBootstrapSession();
		authSession.isLoggedIn = false;
		authSession.ready = true;
		authSession.needsOnboarding = false;
		authSession.staffMemberships = [];
		authSession.schoolId = null;
		authSession.sessionKind = null;
		authSession.userId = null;
		authSession.clear.mockClear();
		authSession.setPendingOnboarding.mockClear();
		authSession.setStaffMemberships.mockClear();
		authSession.selectStaffMembership.mockClear();
		authSession.setFromServer.mockClear();
		profiles.mockClear();
		effectiveGrants.mockClear();
		profiles.mockImplementation(async () => ({ profiles: [] }));
		effectiveGrants.mockImplementation(async () => ({
			kind: 'staff',
			actorId: 'st1',
			schoolId: 'sch1',
			assuranceLevel: 'verified',
			grants: [{ source: 'owner' }],
		}));
		getSessionImpl = async () => ({
			data: { session: { id: 's1' }, user: { id: 'user-1', email: 'staff@school.edu' } },
		});
		Object.defineProperty(globalThis, 'sessionStorage', {
			configurable: true,
			value: {
				store: new Map<string, string>(),
				getItem(key: string) {
					return this.store.get(key) ?? null;
				},
				setItem(key: string, value: string) {
					this.store.set(key, value);
				},
				removeItem(key: string) {
					this.store.delete(key);
				},
			},
		});
	});

	afterEach(() => {
		resetBootstrapSession();
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});

	it('sends invited staff to the school session instead of onboarding', async () => {
		profiles.mockImplementation(async () => ({
			profiles: [{
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				schoolName: 'Cocody',
				schoolShortName: 'Cocody',
			}],
		}));

		const result = await bootstrapSession();
		expect(result.pendingOnboarding).toBe(false);
		expect(result.session?.kind).toBe('staff');
		expect(authSession.setPendingOnboarding).not.toHaveBeenCalled();
		expect(authSession.selectStaffMembership).toHaveBeenCalledWith(expect.objectContaining({
			schoolId: 'sch1',
			actorId: 'st1',
		}));
		expect(effectiveGrants).toHaveBeenCalled();
	});

	it('does not set pendingOnboarding for dual-kind staff', async () => {
		profiles.mockImplementation(async () => ({
			profiles: [
				{
					kind: 'staff',
					actorId: 'st1',
					schoolId: 'sch1',
					schoolName: 'Cocody',
					schoolShortName: 'Cocody',
				},
				{
					kind: 'teacher',
					actorId: 't1',
					schoolId: 'sch1',
					schoolName: 'Cocody',
					schoolShortName: 'Cocody',
				},
			],
		}));

		const result = await bootstrapSession();
		expect(result.pendingOnboarding).toBe(false);
		expect(authSession.setPendingOnboarding).not.toHaveBeenCalled();
		expect(authSession.selectStaffMembership).toHaveBeenCalled();
	});

	it('does not map grants 401 to onboarding when staff memberships exist', async () => {
		profiles.mockImplementation(async () => ({
			profiles: [{
				kind: 'staff',
				actorId: 'st1',
				schoolId: 'sch1',
				schoolName: 'Cocody',
				schoolShortName: 'Cocody',
			}],
		}));
		effectiveGrants.mockImplementation(async () => {
			throw new ApiError(401, { message: 'Unauthorized' });
		});

		const result = await bootstrapSession();
		expect(result.pendingOnboarding).toBe(false);
		expect(authSession.setPendingOnboarding).not.toHaveBeenCalled();
	});

	it('does not send portal-only identities to onboarding', async () => {
		profiles.mockImplementation(async () => ({
			profiles: [{
				kind: 'teacher',
				actorId: 't1',
				schoolId: 'sch1',
				schoolName: 'Cocody',
				schoolShortName: 'Cocody',
			}],
		}));
		effectiveGrants.mockImplementation(async () => ({
			kind: 'teacher',
			actorId: 't1',
			schoolId: 'sch1',
			assuranceLevel: 'verified',
			grants: [],
		}));

		const result = await bootstrapSession();
		expect(result.pendingOnboarding).toBe(false);
		expect(authSession.setPendingOnboarding).not.toHaveBeenCalled();
		expect(authSession.selectStaffMembership).not.toHaveBeenCalled();
	});

	it('sets pendingOnboarding only when there are no school identities', async () => {
		profiles.mockImplementation(async () => ({ profiles: [] }));
		effectiveGrants.mockImplementation(async () => {
			throw new ApiError(401, { message: 'Unauthorized' });
		});

		const result = await bootstrapSession();
		expect(result.pendingOnboarding).toBe(true);
		expect(authSession.setPendingOnboarding).toHaveBeenCalled();
	});
});
