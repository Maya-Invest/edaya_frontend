import type { SessionSnapshot } from '$lib/auth/types';
import { academicContext } from '$lib/academic/context.svelte';
import {
	fetchGuardianNotificationSettings,
} from '$lib/api/account-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSessionStaffProfile } from '$lib/api/staff-data';
import { persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';
import { fetchServerOnboardingAccountStatus } from '$lib/onboarding/sync-account-status';
import {
	isOnboardingSummaryHold,
	mergeServerOnboardingStatus,
} from '$lib/onboarding/wizard-completion-flag';
import { ApiError } from '@maya-invest/edaya-api-client';
import { authClient } from './client';
import {
	persistSelectedSchoolId,
	pickStaffMembership,
	staffMembershipsFromProfiles,
} from './school-membership';
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
	onboardingStatusUnknown: boolean;
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
		const promise = runBootstrapSession(options).catch((error) => {
			if (sessionBootstrapPromise === promise) {
				sessionBootstrapPromise = null;
			}
			throw error;
		});
		sessionBootstrapPromise = promise;
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

function emptyBootstrapResult(): BootstrapSessionResult {
	return {
		session: null,
		staffProfile: null,
		guardianSettings: null,
		pendingOnboarding: false,
		onboardingStatusUnknown: false,
	};
}

async function runBootstrapSession(
	options: BootstrapSessionOptions = {},
): Promise<BootstrapSessionResult> {
	const generation = bootstrapGeneration;
	const emptyResult = emptyBootstrapResult();

	const silent = options.silent === true;
	if (!silent) {
		authSession.markLoading();
	}
	try {
		const { data: auth } = await authClient.getSession();
		if (generation !== bootstrapGeneration) {
			return emptyResult;
		}
		if (!auth?.session || !auth.user?.id) {
			authSession.clear();
			return emptyResult;
		}

		const loginEmail = auth.user.email ?? null;
		const client = getBrowserSchoolClient();
		let profiles;
		try {
			profiles = await client.authorization.profiles();
		}
		catch (error) {
			if (generation !== bootstrapGeneration) {
				return emptyResult;
			}
			if (error instanceof ApiError && error.status === 401) {
				authSession.clear();
				return emptyResult;
			}
			throw error;
		}

		if (generation !== bootstrapGeneration) {
			return emptyResult;
		}

		const staffMemberships = staffMembershipsFromProfiles(profiles.profiles);
		authSession.setStaffMemberships(staffMemberships);

		const selectedStaff = pickStaffMembership(staffMemberships, auth.user.id);
		if (selectedStaff) {
			persistSelectedSchoolId(auth.user.id, selectedStaff.schoolId);
			authSession.selectStaffMembership(selectedStaff);
			academicContext.setSchoolScope(selectedStaff.schoolId);
		}

		let session: SessionSnapshot;
		try {
			session = await client.authorization.effectiveGrants();
		}
		catch (error) {
			if (generation !== bootstrapGeneration) {
				return emptyResult;
			}
			if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
				if (staffMemberships.length > 0 || profiles.profiles.length > 0) {
					return emptyResult;
				}
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

		if (generation !== bootstrapGeneration) {
			return emptyResult;
		}

		let staffProfile = null;
		let guardianSettings = null;
		let subjectId: string | null = null;
		let onboardingStatusUnknown = false;

		if (session?.kind === 'staff') {
			const [sessionStaffResult, serverOnboardingStatusResult] = await Promise.allSettled([
				fetchSessionStaffProfile(client, session.actorId, {
					isElevated: session.grants.some(grant => grant.source === 'owner'),
				}),
				fetchServerOnboardingAccountStatus(),
			]);
			if (generation !== bootstrapGeneration) {
				return emptyResult;
			}

			let notificationEmail: string | null = null;
			let notificationPhone: string | null = null;
			if (sessionStaffResult.status === 'fulfilled') {
				staffProfile = sessionStaffResult.value.profile;
				subjectId = sessionStaffResult.value.profile.subjectId ?? null;
				notificationEmail = sessionStaffResult.value.notificationEmail;
				notificationPhone = sessionStaffResult.value.notificationPhone;
			}

			authSession.setFromServer(session, {
				staffProfile,
				guardianSettings,
				subjectId,
				loginEmail,
				authUserId: auth.user.id,
				notificationEmail,
				notificationPhone,
			});

			if (serverOnboardingStatusResult.status === 'fulfilled' && serverOnboardingStatusResult.value) {
				const mergedOnboardingStatus = mergeServerOnboardingStatus(
					authSession.serverOnboardingStatus,
					serverOnboardingStatusResult.value,
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
			}
			else {
				onboardingStatusUnknown = true;
				authSession.setOnboardingStatusUnknown(true);
			}

			return {
				session,
				staffProfile,
				guardianSettings,
				pendingOnboarding: false,
				onboardingStatusUnknown,
			};
		}
		else if (session?.kind === 'guardian') {
			try {
				guardianSettings = await fetchGuardianNotificationSettings(client, session.actorId);
				subjectId = guardianSettings?.subjectId ?? null;
			}
			catch {
				onboardingStatusUnknown = true;
			}
		}

		if (generation !== bootstrapGeneration) {
			return emptyResult;
		}

		authSession.setFromServer(session, {
			staffProfile,
			guardianSettings,
			subjectId,
			loginEmail,
			authUserId: auth.user.id,
		});
		if (onboardingStatusUnknown) {
			authSession.setOnboardingStatusUnknown(true);
		}
		return {
			session,
			staffProfile,
			guardianSettings,
			pendingOnboarding: false,
			onboardingStatusUnknown,
		};
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			if (generation === bootstrapGeneration) {
				authSession.clear();
			}
			return emptyResult;
		}
		throw error;
	}
	finally {
		if (!silent && generation === bootstrapGeneration) {
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
