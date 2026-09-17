import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { ApiError } from '@maya-invest/edaya-api-client';

const acceptInvitation = mock(async (_token: string) => ({ kind: 'staff', entity: {} }));

mock.module('$lib/api/invitation-data', () => ({
	acceptInvitation,
}));

const resetAppShellBootstrap = mock(() => {});
const bootstrapAppShell = mock(async () => {});
const invalidateAppShellBootstrapCache = mock(() => {});

mock.module('$lib/auth/bootstrap-app', () => ({
	resetAppShellBootstrap,
	bootstrapAppShell,
	invalidateAppShellBootstrapCache,
}));

const bootstrap = await import('$lib/auth/bootstrap');
const { persistPendingInviteToken, clearPendingInviteToken } = await import('$lib/auth/pending-invite-token');
const { acceptPendingInviteIfPresent, bootstrapSessionAfterInvite } = await import('$lib/auth/accept-pending-invite');

const pendingOnboardingResult = {
	session: null,
	staffProfile: null,
	guardianSettings: null,
	pendingOnboarding: true,
	onboardingStatusUnknown: false,
} as const;

let bootstrapSession: ReturnType<typeof spyOn<typeof bootstrap, 'bootstrapSession'>>;
let resetBootstrapSession: ReturnType<typeof spyOn<typeof bootstrap, 'resetBootstrapSession'>>;

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

	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: createStore(),
	});
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: createStore(),
	});
}

describe('accept pending invite after sign-in', () => {
	beforeEach(() => {
		mockWebStorage();
		acceptInvitation.mockClear();
		bootstrapSession = spyOn(bootstrap, 'bootstrapSession').mockImplementation(async () => ({
			...pendingOnboardingResult,
		}));
		resetBootstrapSession = spyOn(bootstrap, 'resetBootstrapSession').mockImplementation(() => {});
		resetAppShellBootstrap.mockClear();
		clearPendingInviteToken();
	});

	afterEach(() => {
		bootstrapSession.mockRestore();
		resetBootstrapSession.mockRestore();
		clearPendingInviteToken();
		Reflect.deleteProperty(globalThis, 'localStorage');
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});

	it('accepts a stored staff invite instead of leaving the account unlinked', async () => {
		persistPendingInviteToken('invite-token');
		acceptInvitation.mockImplementation(async () => ({ kind: 'staff', entity: {} }));
		expect(await acceptPendingInviteIfPresent()).toBe(true);
		expect(acceptInvitation).toHaveBeenCalledWith('invite-token');
		expect(globalThis.localStorage.getItem('edaya:pending-invite-token')).toBeNull();
	});

	it('treats an already-accepted invite as linked', async () => {
		persistPendingInviteToken('invite-token');
		acceptInvitation.mockImplementation(async () => {
			throw new ApiError(409, { code: 'INVITATION_ALREADY_ACCEPTED' });
		});
		expect(await acceptPendingInviteIfPresent()).toBe(true);
		expect(globalThis.localStorage.getItem('edaya:pending-invite-token')).toBeNull();
	});

	it('re-bootstraps into the school session after accepting the invite', async () => {
		persistPendingInviteToken('invite-token');
		bootstrapSession.mockImplementationOnce(async () => ({
			session: null,
			staffProfile: null,
			guardianSettings: null,
			pendingOnboarding: true,
			onboardingStatusUnknown: false,
		}));
		bootstrapSession.mockImplementation(async () => ({
			session: { kind: 'staff', actorId: 'st1', schoolId: 'sch1', grants: [], assuranceLevel: 'verified' },
			staffProfile: null,
			guardianSettings: null,
			pendingOnboarding: false,
			onboardingStatusUnknown: false,
		} as Awaited<ReturnType<typeof bootstrap.bootstrapSession>>));

		const result = await bootstrapSessionAfterInvite();
		expect(result.pendingOnboarding).toBe(false);
		expect(result.session?.kind).toBe('staff');
		expect(resetAppShellBootstrap).toHaveBeenCalled();
	});

	it('accepts a stored second-school invite even when staff already exists', async () => {
		persistPendingInviteToken('invite-token');
		bootstrapSession.mockImplementationOnce(async () => ({
			session: { kind: 'staff', actorId: 'st1', schoolId: 'sch1', grants: [], assuranceLevel: 'verified' },
			staffProfile: null,
			guardianSettings: null,
			pendingOnboarding: false,
			onboardingStatusUnknown: false,
		} as Awaited<ReturnType<typeof bootstrap.bootstrapSession>>));
		bootstrapSession.mockImplementation(async () => ({
			session: { kind: 'staff', actorId: 'st2', schoolId: 'sch2', grants: [], assuranceLevel: 'verified' },
			staffProfile: null,
			guardianSettings: null,
			pendingOnboarding: false,
			onboardingStatusUnknown: false,
		} as Awaited<ReturnType<typeof bootstrap.bootstrapSession>>));

		const result = await bootstrapSessionAfterInvite();
		expect(acceptInvitation).toHaveBeenCalledWith('invite-token');
		expect(result.session?.schoolId).toBe('sch2');
		expect(resetAppShellBootstrap).toHaveBeenCalled();
	});

	it('accepts a stored invite when the first grants read fails', async () => {
		persistPendingInviteToken('invite-token');
		bootstrapSession.mockImplementationOnce(async () => {
			throw new ApiError(403, { message: 'Forbidden' });
		});
		bootstrapSession.mockImplementation(async () => ({
			session: { kind: 'staff', actorId: 'st1', schoolId: 'sch1', grants: [], assuranceLevel: 'verified' },
			staffProfile: null,
			guardianSettings: null,
			pendingOnboarding: false,
			onboardingStatusUnknown: false,
		} as Awaited<ReturnType<typeof bootstrap.bootstrapSession>>));

		const result = await bootstrapSessionAfterInvite();
		expect(acceptInvitation).toHaveBeenCalledWith('invite-token');
		expect(result.session?.kind).toBe('staff');
		expect(resetAppShellBootstrap).toHaveBeenCalled();
	});
});
