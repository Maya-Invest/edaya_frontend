import type { GuardianNotificationSettings, StaffNotificationSettings } from '$lib/api/account-data';
import {
	fetchGuardianNotificationSettings,
	fetchStaffSubjectId,

} from '$lib/api/account-data';
import { entitiesByIds } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';

export interface NotificationSettingsPageData {
	settings: GuardianNotificationSettings | null;
	staffSettings: StaffNotificationSettings | null;
	loginEmail: string | null;
	studentNames: Record<string, string>;
	kind: 'staff' | 'guardian' | 'student' | 'teacher' | null;
}

export function queryNotificationSettingsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: (): NotificationSettingsPageData => ({
			settings: null,
			staffSettings: null,
			loginEmail: authSession.loginEmail,
			studentNames: {},
			kind: authSession.sessionKind,
		}),
		load: async (): Promise<NotificationSettingsPageData> => {
			const client = getBrowserSchoolClient();
			const kind = authSession.sessionKind;
			const actorId = authSession.userId;
			const loginEmail = authSession.loginEmail;
			if (!kind || !actorId) {
				return { settings: null, staffSettings: null, loginEmail, studentNames: {}, kind };
			}
			if (kind === 'guardian') {
				const settings = await fetchGuardianNotificationSettings(client, actorId);
				const studentIds = settings?.links.map(link => link.studentId) ?? [];
				const students = studentIds.length > 0
					? await client.entities.students.list(entitiesByIds(studentIds))
					: [];
				const studentNames = Object.fromEntries(
					(students ?? []).map(student => [
						student.id,
						`${student.firstName} ${student.lastName}`,
					]),
				);
				return { settings, staffSettings: null, loginEmail, studentNames, kind };
			}
			if (kind === 'staff') {
				const staffSettings = await fetchStaffSubjectId(client, actorId);
				return { settings: null, staffSettings, loginEmail, studentNames: {}, kind };
			}
			return { settings: null, staffSettings: null, loginEmail, studentNames: {}, kind };
		},
		hasItems: data => Boolean(data.settings) || Boolean(data.staffSettings),
		errorMessage: 'Unable to load notification settings.',
	});
}
