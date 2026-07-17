import { hasAuthGatePassed } from '$lib/auth/auth-gate';
import { authSession } from '$lib/auth/session.svelte';

export function shouldEnforceLoginGate(): boolean {
	if (!authSession.ready || hasAuthGatePassed()) {
		return false;
	}

	return authSession.hasAuthAccount || authSession.isLoggedIn || authSession.needsOnboarding;
}
