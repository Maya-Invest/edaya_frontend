import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession, resetBootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, invalidateAppShellBootstrapCache, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { persistSelectedSchoolId } from '$lib/auth/school-membership';
import { authSession } from '$lib/auth/session.svelte';
import { canAccessPath } from '$lib/navigation/nav-permissions';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import { invalidatePageQueryCache } from '$lib/queries/page-query-cache';
import { invalidateAll } from '$app/navigation';

export async function switchActiveSchool(schoolId: string): Promise<void> {
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
	await bootstrapSession({ silent: true });
	await bootstrapAppShell();
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
