import type { StaffSchoolMembership } from '$lib/auth/types';
import * as kitNavigation from '$app/navigation';
import * as schoolClient from '$lib/api/school-client';
import * as bootstrap from '$lib/auth/bootstrap';
import * as appNavigation from '$lib/navigation/app-navigation';
import * as navPermissions from '$lib/navigation/nav-permissions';
import * as pageQueryCache from '$lib/queries/page-query-cache';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

const schoolA: StaffSchoolMembership = {
	kind: 'staff',
	actorId: 'st-a',
	schoolId: 'school-a',
	schoolName: 'Lycée A',
	schoolShortName: 'A',
};
const schoolB: StaffSchoolMembership = {
	kind: 'staff',
	actorId: 'st-b',
	schoolId: 'school-b',
	schoolName: 'Lycée B',
	schoolShortName: 'B',
};

const setSchoolScope = mock((_schoolId: string) => {});
const setYear = mock((_yearId: string) => {});
const catalog = [{ schoolId: schoolB.schoolId, id: 'destination-year' }];
mock.module('$lib/academic/context.svelte', () => ({
	academicContext: { shellReady: false, yearId: '', years: catalog, setYear, setSchoolScope },
}));
mock.module('$lib/academic/context.svelte.ts', () => ({
	academicContext: { shellReady: false, yearId: '', years: catalog, setYear, setSchoolScope },
}));

const authSession = {
	schoolId: 'school-a' as string | null,
	authUserId: 'user-1' as string | null,
	userId: 'st-a' as string | null,
	sessionKind: 'staff' as string | null,
	staffMemberships: [schoolA, schoolB],
	selectStaffMembership: mock((membership: StaffSchoolMembership) => {
		authSession.schoolId = membership.schoolId;
		authSession.userId = membership.actorId;
		authSession.sessionKind = 'staff';
	}),
};
mock.module('$lib/auth/session.svelte', () => ({ authSession }));
mock.module('$lib/auth/session.svelte.ts', () => ({ authSession }));

const bootstrapAppShell = mock(async () => {});
const resetAppShellBootstrap = mock(() => {});
const invalidateAppShellBootstrapCache = mock(() => {});
mock.module('$lib/auth/bootstrap-app', () => ({
	bootstrapAppShell,
	resetAppShellBootstrap,
	invalidateAppShellBootstrapCache,
}));
mock.module('$lib/auth/bootstrap-app.ts', () => ({
	bootstrapAppShell,
	resetAppShellBootstrap,
	invalidateAppShellBootstrapCache,
}));

const { switchActiveSchool } = await import('$lib/auth/switch-school');

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

describe('switchActiveSchool', () => {
	const spies: Array<{ mockRestore: () => void }> = [];
	let canAccessPathSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mockSessionStorage();
		authSession.schoolId = 'school-a';
		authSession.authUserId = 'user-1';
		authSession.userId = 'st-a';
		authSession.sessionKind = 'staff';
		authSession.staffMemberships = [schoolA, schoolB];
		authSession.selectStaffMembership.mockClear();
		setSchoolScope.mockClear();
		setYear.mockClear();
		bootstrapAppShell.mockClear();
		resetAppShellBootstrap.mockClear();
		invalidateAppShellBootstrapCache.mockClear();
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: { location: { pathname: '/school/students' } },
		});

		canAccessPathSpy = spyOn(navPermissions, 'canAccessPath').mockImplementation(() => true);
		spies.push(
			spyOn(bootstrap, 'bootstrapSession').mockImplementation(async () => ({
				session: { kind: 'staff', assuranceLevel: 'standard', actorId: schoolB.actorId, schoolId: schoolB.schoolId, grants: [] },
				staffProfile: null,
				guardianSettings: null,
				pendingOnboarding: false,
				onboardingStatusUnknown: false,
			})),
			spyOn(bootstrap, 'resetBootstrapSession').mockImplementation(() => {}),
			spyOn(schoolClient, 'configureBrowserSchoolClient').mockImplementation(() => {}),
			spyOn(pageQueryCache, 'invalidatePageQueryCache').mockImplementation(() => {}),
			canAccessPathSpy,
			spyOn(appNavigation, 'appGoto').mockImplementation(async () => {}),
			spyOn(appNavigation, 'appPath').mockImplementation(() => '/dashboard' as never),
			spyOn(kitNavigation, 'invalidateAll').mockImplementation(async () => {}),
		);
	});

	afterEach(() => {
		while (spies.length > 0) {
			spies.pop()?.mockRestore();
		}
		Reflect.deleteProperty(globalThis, 'sessionStorage');
		Reflect.deleteProperty(globalThis, 'window');
	});

	it('is a no-op when the school is already active', async () => {
		await switchActiveSchool('school-a');
		expect(authSession.selectStaffMembership).not.toHaveBeenCalled();
		expect(bootstrap.bootstrapSession).not.toHaveBeenCalled();
	});

	it('persists the membership, refreshes grants and the shell, and keeps an allowed route', async () => {
		await switchActiveSchool('school-b');

		expect(sessionStorage.getItem('edaya:schoolId:user-1')).toBe('school-b');
		expect(authSession.selectStaffMembership).toHaveBeenCalledWith(schoolB);
		expect(setSchoolScope).toHaveBeenCalledWith('school-b');
		expect(bootstrap.resetBootstrapSession).toHaveBeenCalled();
		expect(resetAppShellBootstrap).toHaveBeenCalled();
		expect(invalidateAppShellBootstrapCache).toHaveBeenCalled();
		expect(pageQueryCache.invalidatePageQueryCache).toHaveBeenCalled();
		expect(bootstrap.bootstrapSession).toHaveBeenCalledWith();
		expect(bootstrapAppShell).toHaveBeenCalled();
		expect(kitNavigation.invalidateAll).toHaveBeenCalled();
		expect(appNavigation.appGoto).not.toHaveBeenCalled();
	});

	it('applies the chosen year from the destination catalog', async () => {
		await switchActiveSchool(schoolB.schoolId, 'destination-year');
		expect(setYear).toHaveBeenCalledWith('destination-year');
	});

	it('keeps the destination shell default when a previewed year is no longer available', async () => {
		await switchActiveSchool(schoolB.schoolId, 'removed-year');
		expect(setYear).not.toHaveBeenCalled();
	});

	it('sends the staff to dashboard when the current path is not allowed in the new school', async () => {
		canAccessPathSpy.mockImplementation(() => false);
		await switchActiveSchool('school-b');
		expect(appNavigation.appGoto).toHaveBeenCalledWith('/dashboard', { replaceState: true, invalidateAll: true });
		expect(kitNavigation.invalidateAll).not.toHaveBeenCalled();
	});
});
