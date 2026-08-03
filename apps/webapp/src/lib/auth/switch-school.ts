import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession, resetBootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, invalidateAppShellBootstrapCache, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';

export async function switchActiveSchool(schoolId: string): Promise<void> {
	if (!schoolId || authSession.schoolId === schoolId)
		return;
	authSession.userId = null;
	authSession.schoolId = schoolId;
	authSession.grants = null;
	resetBootstrapSession();
	resetAppShellBootstrap();
	invalidateAppShellBootstrapCache();
	configureBrowserSchoolClient({
		getYearId: () => (academicContext.shellReady ? academicContext.yearId : undefined),
	});
	await bootstrapSession({ silent: true });
	await bootstrapAppShell();
}
