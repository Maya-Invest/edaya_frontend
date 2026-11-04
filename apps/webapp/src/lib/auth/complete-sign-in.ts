import { bootstrapSessionAfterInvite } from '$lib/auth/accept-pending-invite';
import { markAuthGatePassed } from '$lib/auth/auth-gate';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { leaveStaffWebappForSessionKind } from '$lib/auth/leave-staff-webapp';
import { resolvePostAuthPath } from '$lib/auth/resolve-post-auth';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { appGoto } from '$lib/navigation/app-navigation';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function completeAuthSignIn(successMessage?: string, navigation?: { replaceState: boolean }): Promise<boolean> {
	resetAppShellBootstrap();
	const { session, pendingOnboarding } = await bootstrapSessionAfterInvite();

	if (pendingOnboarding) {
		if (successMessage) {
			toast.success(successMessage);
		}
		markAuthGatePassed();
		await appGoto(resolvePostAuthPath({ session: null, pendingOnboarding: true }), navigation);
		return true;
	}

	if (!session) {
		toast.error(get(t)('auth.sessionUnavailable'));
		return false;
	}

	if (session.kind === 'teacher' || session.kind === 'guardian' || session.kind === 'student') {
		const hintKey = session.kind === 'teacher'
			? 'auth.teacherPortalGateHint'
			: session.kind === 'guardian'
				? 'auth.guardianPortalGateHint'
				: 'auth.studentPortalGateHint';
		toast.info(get(t)(hintKey));
		await leaveStaffWebappForSessionKind(session.kind);
		return true;
	}

	if (successMessage) {
		toast.success(successMessage);
	}

	markAuthGatePassed();
	await appGoto(resolvePostAuthPath({
		session,
		pendingOnboarding: false,
		authUserId: authSession.authUserId,
	}), navigation);
	return true;
}

export { ONBOARDING_PATH, redirectPathIfAuthenticated, resolveLinkedActorPath, resolvePostAuthPath } from '$lib/auth/resolve-post-auth';
