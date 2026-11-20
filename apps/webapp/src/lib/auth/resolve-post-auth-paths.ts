import type { SessionKind } from '$lib/auth/account-actor';
import type { SessionSnapshot } from '$lib/auth/types';
import type { ServerOnboardingAccountStatus } from '$lib/onboarding/types';
import { pendingInvitePath } from '$lib/auth/pending-invite-token';
import { appPath } from '$lib/navigation/app-navigation';
import { onboardingStepUrl } from '$lib/onboarding/navigation';
import { onboardingResumePath } from '$lib/onboarding/resume-onboarding';

export const ONBOARDING_PATH = onboardingStepUrl(1);

export function resolveLinkedActorPath(
	session?: SessionSnapshot | null,
	context?: {
		sessionKind?: SessionKind | null;
	},
): string {
	const kind = session?.kind ?? context?.sessionKind;

	if (kind === 'staff') {
		return appPath('/(app)/dashboard');
	}

	// Linked teachers, guardians, and students use portal apps — staff webapp redirects to login.
	if (kind === 'teacher' || kind === 'guardian' || kind === 'student') {
		return appPath('/login');
	}

	return appPath('/(app)/school/students/[[id]]');
}

export function resolvePostAuthPath(options: {
	session: SessionSnapshot | null;
	pendingOnboarding: boolean;
	authUserId?: string | null;
	sessionKind?: SessionKind | null;
	serverOnboardingStatus?: ServerOnboardingAccountStatus | null;
	onboardingStatusUnknown?: boolean;
}): string {
	if (options.pendingOnboarding) {
		return pendingInvitePath() ?? ONBOARDING_PATH;
	}

	if (!options.session) {
		return appPath('/login');
	}

	if (options.onboardingStatusUnknown) {
		return resolveLinkedActorPath(options.session, {
			sessionKind: options.sessionKind ?? options.session.kind,
		});
	}

	const kind = options.sessionKind ?? options.session.kind;
	if (kind === 'staff') {
		const resumePath = onboardingResumePath(
			options.authUserId,
			options.session.schoolId,
			options.serverOnboardingStatus,
		);
		if (resumePath) {
			return resumePath;
		}
	}

	return resolveLinkedActorPath(options.session, {
		sessionKind: kind,
	});
}
