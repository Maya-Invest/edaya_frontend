import type { SessionKind } from '$lib/auth/account-actor';
import type { SessionSnapshot } from '$lib/auth/types';
import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { appPath } from '$lib/navigation/app-navigation';
import { onboardingResumePath } from '$lib/onboarding/resume-onboarding';

export const ONBOARDING_PATH = appPath('/onboarding');

export function resolveLinkedActorPath(
	session?: SessionSnapshot | null,
	context?: {
		role?: string | null;
		sessionKind?: SessionKind | null;
	},
): string {
	const role = context?.role;
	const kind = session?.kind ?? context?.sessionKind;

	if (kind === 'staff') {
		return appPath('/(app)/dashboard');
	}

	return appPath('/(app)/school/students/[[id]]');
}

export function resolvePostAuthPath(options: {
	session: SessionSnapshot | null;
	pendingOnboarding: boolean;
	authUserId?: string | null;
	role?: string | null;
	sessionKind?: SessionKind | null;
	serverOnboardingStatus?: ServerOnboardingAccountStatus | null;
}): string {
	if (options.pendingOnboarding) {
		return ONBOARDING_PATH;
	}

	if (!options.session) {
		return appPath('/login');
	}

	const resumePath = onboardingResumePath(
		options.authUserId,
		options.session.schoolId,
		options.serverOnboardingStatus,
	);
	if (resumePath) {
		return resumePath;
	}

	return resolveLinkedActorPath(options.session, {
		role: options.role,
		sessionKind: options.sessionKind ?? options.session.kind,
	});
}
