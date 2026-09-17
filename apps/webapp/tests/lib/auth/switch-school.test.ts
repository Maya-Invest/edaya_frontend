import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { academicContext } from '$lib/academic/context.svelte';
import * as schoolClient from '$lib/api/school-client';
import * as bootstrap from '$lib/auth/bootstrap';
import * as bootstrapApp from '$lib/auth/bootstrap-app';
import { switchActiveSchool } from '$lib/auth/switch-school';
import { authSession } from '$lib/auth/session.svelte';
import type { StaffSchoolMembership } from '$lib/auth/types';
import * as appNavigation from '$lib/navigation/app-navigation';
import * as navPermissions from '$lib/navigation/nav-permissions';
import * as pageQueryCache from '$lib/queries/page-query-cache';
import * as kitNavigation from '$app/navigation';

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

	beforeEach(() => {
		mockSessionStorage();
		authSession.schoolId = 'school-a';
		authSession.authUserId = 'user-1';
		authSession.staffMemberships = [schoolA, schoolB];
		authSession.selectStaffMembership = mock((membership: StaffSchoolMembership) => {
			authSession.schoolId = membership.schoolId;
			authSession.userId = membership.actorId;
			authSession.sessionKind = 'staff';
		});
		academicContext.setSchoolScope = mock((_schoolId: string) => {});
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: { location: { pathname: '/school/students' } },
		});

		spies.push(
			spyOn(bootstrap, 'bootstrapSession').mockImplementation(async () => ({
				session: null,
				staffProfile: null,
				guardianSettings: null,
				pendingOnboarding: false,
				onboardingStatusUnknown: false,
			})),
			spyOn(bootstrap, 'resetBootstrapSession').mockImplementation(() => {}),
			spyOn(bootstrapApp, 'bootstrapAppShell').mockImplementation(async () => {}),
			spyOn(bootstrapApp, 'resetAppShellBootstrap').mockImplementation(() => {}),
			spyOn(bootstrapApp, 'invalidateAppShellBootstrapCache').mockImplementation(() => {}),
			spyOn(schoolClient, 'configureBrowserSchoolClient').mockImplementation(() => {}),
			spyOn(pageQueryCache, 'invalidatePageQueryCache').mockImplementation(() => {}),
			spyOn(navPermissions, 'canAccessPath').mockImplementation(() => true),
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
		expect(academicContext.setSchoolScope).toHaveBeenCalledWith('school-b');
		expect(bootstrap.resetBootstrapSession).toHaveBeenCalled();
		expect(bootstrapApp.resetAppShellBootstrap).toHaveBeenCalled();
		expect(bootstrapApp.invalidateAppShellBootstrapCache).toHaveBeenCalled();
		expect(pageQueryCache.invalidatePageQueryCache).toHaveBeenCalled();
		expect(bootstrap.bootstrapSession).toHaveBeenCalledWith({ silent: true });
		expect(bootstrapApp.bootstrapAppShell).toHaveBeenCalled();
		expect(kitNavigation.invalidateAll).toHaveBeenCalled();
		expect(appNavigation.appGoto).not.toHaveBeenCalled();
	});

	it('sends the staff to dashboard when the current path is not allowed in the new school', async () => {
		spies.find(() => true);
		(navPermissions.canAccessPath as ReturnType<typeof spyOn>).mockImplementation(() => false);
		await switchActiveSchool('school-b');
		expect(appNavigation.appGoto).toHaveBeenCalledWith('/dashboard', { replaceState: true, invalidateAll: true });
		expect(kitNavigation.invalidateAll).not.toHaveBeenCalled();
	});
});
