import { markAuthGatePassed } from '$lib/auth/auth-gate';
import { bootstrapSession } from '$lib/auth/bootstrap';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { guardianPortalLoginPath } from '$lib/auth/guardian-portal-gate';
import { resolvePostAuthPath } from '$lib/auth/resolve-post-auth';
import { authSession } from '$lib/auth/session.svelte';
import { teacherPortalLoginPath } from '$lib/auth/teacher-portal-gate';
import { t } from '$lib/i18n';
import { appGoto } from '$lib/navigation/app-navigation';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function completeAuthSignIn(successMessage?: string): Promise<boolean> {
	resetAppShellBootstrap();
	const { session, pendingOnboarding } = await bootstrapSession();

	if (pendingOnboarding) {
		if (successMessage) {
			toast.success(successMessage);
		}
		markAuthGatePassed();
		appGoto(resolvePostAuthPath({ session: null, pendingOnboarding: true }));
		return true;
	}

	if (!session) {
		toast.error(get(t)('auth.sessionUnavailable'));
		return false;
	}

	if (session.kind === 'teacher') {
		await authSession.logout();
		resetAppShellBootstrap();
		toast.info(get(t)('auth.teacherPortalGateHint'));
		appGoto(teacherPortalLoginPath(), { replaceState: true });
		return true;
	}

	if (session.kind === 'guardian') {
		await authSession.logout();
		resetAppShellBootstrap();
		toast.info(get(t)('auth.guardianPortalGateHint'));
		appGoto(guardianPortalLoginPath(), { replaceState: true });
		return true;
	}

	if (successMessage) {
		toast.success(successMessage);
	}

	markAuthGatePassed();
	appGoto(resolvePostAuthPath({
		session,
		pendingOnboarding: false,
		authUserId: authSession.authUserId,
	}));
	return true;
}

export { ONBOARDING_PATH, redirectPathIfAuthenticated, resolveLinkedActorPath, resolvePostAuthPath } from '$lib/auth/resolve-post-auth';
