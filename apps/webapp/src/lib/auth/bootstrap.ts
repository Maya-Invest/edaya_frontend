import type { SessionSnapshot } from '$lib/auth/types';
import { ApiError } from '$api-client';
import {
	fetchGuardianNotificationSettings,
} from '$lib/api/account-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSessionStaffProfile } from '$lib/api/staff-data';
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

export async function bootstrapSession(): Promise<BootstrapSessionResult> {
	const emptyResult: BootstrapSessionResult = {
		session: null,
		staffProfile: null,
		guardianSettings: null,
		pendingOnboarding: false,
	};

	authSession.markLoading();
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
			if (error instanceof ApiError && error.status === 401) {
				authSession.setPendingOnboarding({
					authUserId: auth.user.id,
					loginEmail,
				});
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
			const sessionStaff = await fetchSessionStaffProfile(client, session.actorId);
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
		authSession.markReady();
	}
}
