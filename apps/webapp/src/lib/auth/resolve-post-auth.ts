import type { SessionSnapshot } from '$lib/auth/types';
import {
	ONBOARDING_PATH,
	resolveLinkedActorPath as resolveLinkedActorPathCore,
	resolvePostAuthPath as resolvePostAuthPathCore,
} from '$lib/auth/resolve-post-auth-paths';
import { authSession } from '$lib/auth/session.svelte';
import { onboardingResumePath } from '$lib/onboarding/resume-onboarding';

export { ONBOARDING_PATH };

export function resolveLinkedActorPath(session?: SessionSnapshot | null): string {
	return resolveLinkedActorPathCore(session, {
		role: authSession.user?.role,
		sessionKind: authSession.sessionKind,
	});
}

export function resolvePostAuthPath(options: {
	session: SessionSnapshot | null;
	pendingOnboarding: boolean;
	authUserId?: string | null;
}): string {
	return resolvePostAuthPathCore({
		...options,
		authUserId: options.authUserId ?? authSession.authUserId,
		role: authSession.user?.role,
		sessionKind: authSession.sessionKind,
		serverOnboardingStatus: authSession.serverOnboardingStatus,
	});
}

export function redirectPathIfAuthenticated(): string | null {
	if (!authSession.ready) {
		return null;
	}

	if (authSession.needsOnboarding) {
		return ONBOARDING_PATH;
	}

	if (authSession.isLoggedIn) {
		const resumePath = onboardingResumePath(
			authSession.authUserId,
			authSession.schoolId,
			authSession.serverOnboardingStatus,
		);
		if (resumePath) {
			return resumePath;
		}
		return resolveLinkedActorPath();
	}

	return null;
}
