import type { GuardianNotificationSettings, StaffNotificationSettings } from '$lib/api/account-data';

export interface NotificationSettingsPageSlice {
	settings: GuardianNotificationSettings | null;
	staffSettings: StaffNotificationSettings | null;
	loginEmail: string | null;
	studentNames: Record<string, string>;
	kind: 'staff' | 'guardian' | 'student' | 'teacher' | null;
}

export function emptyNotificationSettingsSlice(): NotificationSettingsPageSlice {
	return {
		settings: null,
		staffSettings: null,
		loginEmail: null,
		studentNames: {},
		kind: null,
	};
}
