import type { NotificationSettingsPageState } from '../notification-settings-page.svelte';
import type { NotificationSettingsPageSlice } from './notification-settings-helpers';
import {
	fetchGuardianNotificationSettings,
	fetchStaffSubjectId,
} from '$lib/api/account-data';
import { entitiesByIds } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { resolvePageLoad } from '$lib/queries/page-status';
import { emptyNotificationSettingsSlice } from './notification-settings-helpers';

export async function loadNotificationSettingsSlice(): Promise<NotificationSettingsPageSlice> {
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
}

export function queryNotificationSettingsListPage(state: NotificationSettingsPageState) {
	return (url: URL) => resolvePageLoad(url, {
		empty: (): NotificationSettingsPageSlice => ({
			...emptyNotificationSettingsSlice(),
			loginEmail: authSession.loginEmail,
			kind: authSession.sessionKind,
		}),
		load: async () => {
			const data = await loadNotificationSettingsSlice();
			state.applySlice(data);
			return data;
		},
		hasItems: data => Boolean(data.settings) || Boolean(data.staffSettings),
		errorMessage: 'Unable to load notification settings.',
	});
}
