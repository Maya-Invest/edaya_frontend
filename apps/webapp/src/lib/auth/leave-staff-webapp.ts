import type { SessionKind } from '$lib/auth/account-actor';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { guardianPortalLoginPath } from '$lib/auth/guardian-portal-gate';
import { authSession } from '$lib/auth/session.svelte';
import { studentPortalLoginPath } from '$lib/auth/student-portal-gate';
import { teacherPortalLoginPath } from '$lib/auth/teacher-portal-gate';
import { appGoto } from '$lib/navigation/app-navigation';

export async function leaveStaffWebappForSessionKind(kind: SessionKind): Promise<void> {
	resetAppShellBootstrap();
	await authSession.logout();
	if (kind === 'teacher') {
		await appGoto(teacherPortalLoginPath(), { replaceState: true });
		return;
	}
	if (kind === 'guardian') {
		await appGoto(guardianPortalLoginPath(), { replaceState: true });
		return;
	}
	if (kind === 'student') {
		await appGoto(studentPortalLoginPath(), { replaceState: true });
		return;
	}
	await appGoto('/login', { replaceState: true });
}
