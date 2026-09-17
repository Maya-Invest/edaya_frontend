import type { SessionSnapshot } from '$lib/auth/types';
import {
	fetchGuardianNotificationSettings,
} from '$lib/api/account-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSessionStaffProfile } from '$lib/api/staff-data';
import { persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';
import { isOnboardingSummaryHold } from '$lib/onboarding/wizard-completion-flag';
import {
	fetchServerOnboardingAccountStatus,
} from '$lib/onboarding/sync-account-status';
import { mergeServerOnboardingStatus } from '$lib/onboarding/wizard-completion-flag';
import { ApiError } from '@maya-invest/edaya-api-client';
import { authClient } from './client';
import { authSession } from './session.svelte';

export async function getAuthenticatedAuthUser() {
	const { data: auth } = await authClient.getSession();
	if (!auth?.session || !auth.user?.id) {
		return null;
	}

	return auth.user;
}

export interface BootstrapSessionResult {
	session: SessionSnapshot | null;
	staffProfile: Awaited<ReturnType<typeof fetchSessionStaffProfile>>['profile'] | null;
	guardianSettings: Awaited<ReturnType<typeof fetchGuardianNotificationSettings>> | null;
	pendingOnboarding: boolean;
}

let sessionBootstrapPromise: Promise<BootstrapSessionResult> | null = null;
/** Bumps when a full bootstrap is reset so in-flight auth-only fetches cannot clobber it. */
let bootstrapGeneration = 0;

export interface BootstrapSessionOptions {
	/** Refreshes session data without toggling authSession.ready (avoids full-page loaders). */
	silent?: boolean;
}

export async function bootstrapSession(
	options: BootstrapSessionOptions = {},
): Promise<BootstrapSessionResult> {
	if (!sessionBootstrapPromise) {
		sessionBootstrapPromise = runBootstrapSession(options);
	}
	return sessionBootstrapPromise;
}

export function resetBootstrapSession() {
	sessionBootstrapPromise = null;
	bootstrapGeneration += 1;
}

function fullSessionBootstrapOwnsAuth(): boolean {
	return authSession.isLoggedIn || sessionBootstrapPromise !== null;
}

async function runBootstrapSession(
	options: BootstrapSessionOptions = {},
): Promise<BootstrapSessionResult> {
	const emptyResult: BootstrapSessionResult = {
		session: null,
		staffProfile: null,
		guardianSettings: null,
		pendingOnboarding: false,
	};

	const silent = options.silent === true;
	if (!silent) {
		authSession.markLoading();
	}
	try {
		const { data: auth } = await authClient.getSession();
		if (!auth?.session || !auth.user?.id) {
			authSession.clear();
			return emptyResult;
		}

		const loginEmail = auth.user.email ?? null;
		let session: SessionSnapshot;
		try {
			session = await getBrowserSchoolClient().authorization.effectiveGrants();
		}
		catch (error) {
			if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
				if (!silent) {
					authSession.setPendingOnboarding({
						authUserId: auth.user.id,
						loginEmail,
					});
				}
				return {
					...emptyResult,
					pendingOnboarding: true,
				};
			}
			throw error;
		}

		const client = getBrowserSchoolClient();
		let staffProfile = null;
		let guardianSettings = null;
		let subjectId: string | null = null;

		if (session?.kind === 'staff') {
			const [sessionStaff, serverOnboardingStatus] = await Promise.all([
				fetchSessionStaffProfile(client, session.actorId, {
					isElevated: session.grants.some(grant => grant.source === 'owner'),
				}),
				fetchServerOnboardingAccountStatus(),
			]);
			staffProfile = sessionStaff.profile;
			subjectId = sessionStaff.profile.subjectId ?? null;
			authSession.setFromServer(session, {
				staffProfile,
				guardianSettings,
				subjectId,
				loginEmail,
				authUserId: auth.user.id,
				notificationEmail: sessionStaff.notificationEmail,
				notificationPhone: sessionStaff.notificationPhone,
			});

			const mergedOnboardingStatus = mergeServerOnboardingStatus(
				authSession.serverOnboardingStatus,
				serverOnboardingStatus,
			);
			authSession.setServerOnboardingStatus(mergedOnboardingStatus);
			if (mergedOnboardingStatus) {
				persistServerOnboardingStatusToDraft(
					auth.user.id,
					mergedOnboardingStatus,
					session.schoolId,
					{ holdLocalWizardCompleted: isOnboardingSummaryHold(auth.user.id) },
				);
			}

			return { session, staffProfile, guardianSettings, pendingOnboarding: false };
		}
		else if (session?.kind === 'guardian') {
			guardianSettings = await fetchGuardianNotificationSettings(client, session.actorId);
			subjectId = guardianSettings?.subjectId ?? null;
		}

		authSession.setFromServer(session, {
			staffProfile,
			guardianSettings,
			subjectId,
			loginEmail,
			authUserId: auth.user.id,
		});
		return { session, staffProfile, guardianSettings, pendingOnboarding: false };
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			authSession.clear();
			return emptyResult;
		}
		throw error;
	}
	finally {
		if (!silent) {
			authSession.markReady();
		}
	}
}

export async function bootstrapAuthOnly(): Promise<void> {
	if (fullSessionBootstrapOwnsAuth()) {
		return;
	}

	const generation = bootstrapGeneration;
	authSession.markLoading();
	try {
		const { data: auth } = await authClient.getSession();
		if (generation !== bootstrapGeneration || fullSessionBootstrapOwnsAuth()) {
			return;
		}

		if (!auth?.session || !auth.user?.id) {
			authSession.clear();
			return;
		}

		authSession.setAuthAccountOnly({
			authUserId: auth.user.id,
			loginEmail: auth.user.email ?? null,
		});
	}
	finally {
		if (generation === bootstrapGeneration && !sessionBootstrapPromise) {
			authSession.markReady();
		}
	}
}
