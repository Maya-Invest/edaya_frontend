import type { StaffSchoolMembership } from '$lib/auth/types';
import { invalidateAll } from '$app/navigation';
import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient, createMembershipSchoolClient } from '$lib/api/school-client';
import { fetchSchoolYears } from '$lib/api/shell-data';
import { bootstrapSession, resetBootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, invalidateAppShellBootstrapCache, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { persistSelectedSchoolId } from '$lib/auth/school-membership';
import { authSession } from '$lib/auth/session.svelte';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import { canAccessPath } from '$lib/navigation/nav-permissions';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';

export function previewSchoolYears(membership: StaffSchoolMembership) {
	return fetchSchoolYears(createMembershipSchoolClient(membership), membership.schoolId);
}

export async function switchActiveSchool(schoolId: string, yearId?: string): Promise<void> {
	if (!schoolId || authSession.schoolId === schoolId) {
		return;
	}

	const membership = authSession.staffMemberships.find(entry => entry.schoolId === schoolId);
	if (!membership) {
		return;
	}

	persistSelectedSchoolId(authSession.authUserId, schoolId);
	authSession.selectStaffMembership(membership);
	academicContext.setSchoolScope(schoolId);
	resetBootstrapSession();
	resetAppShellBootstrap();
	invalidateAppShellBootstrapCache();
	invalidatePageQueryCache();
	configureBrowserSchoolClient({
		getYearId: () => (academicContext.shellReady ? academicContext.yearId : undefined),
	});
	const { session } = await bootstrapSession();
	if (!session)
		return;
	await bootstrapAppShell();
	if (authSession.schoolId !== schoolId)
		return;
	if (yearId && academicContext.years.some(year => year.schoolId === schoolId && year.id === yearId))
		academicContext.setYear(yearId);
	else if (yearId !== undefined && academicContext.years.length === 0)
		academicContext.setYear('');
	await refreshRouteForActiveSchool();
}

async function refreshRouteForActiveSchool(): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	const pathname = window.location.pathname;
	const allowed = canAccessPath(pathname, authSession.grants, {
		schoolId: authSession.schoolId ?? '',
	});
	if (!allowed) {
		await appGoto(appPath('/(app)/dashboard'), { replaceState: true, invalidateAll: true });
		return;
	}

	await invalidateAll();
}
