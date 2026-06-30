import { markAuthGatePassed } from '$lib/auth/auth-gate';
import { bootstrapSession } from '$lib/auth/bootstrap';
import { resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import {
	redirectPathIfAuthenticated,
	resolvePostAuthPath,
} from '$lib/auth/resolve-post-auth';
import { authSession } from '$lib/auth/session.svelte';
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

/** @deprecated Use redirectPathIfAuthenticated from resolve-post-auth.ts */
export function redirectPathIfLoggedIn(): string | null {
	return redirectPathIfAuthenticated();
}

export { ONBOARDING_PATH, redirectPathIfAuthenticated, resolveLinkedActorPath, resolvePostAuthPath } from '$lib/auth/resolve-post-auth';
