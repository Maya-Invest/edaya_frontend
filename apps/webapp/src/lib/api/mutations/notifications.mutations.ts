import type { GuardianNotificationSettings } from '$lib/api/account-data';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export interface GuardianNotificationPreferencesInput {
	guardianId: string;
	phone: string | null;
	alternativePhone: string | null;
	email: string | null;
	emailNotificationsEnabled: boolean;
	smsNotificationsEnabled: boolean;
	pushNotificationsEnabled: boolean;
	links: Array<{ studentId: string; receivesAcademicReports: boolean; receivesAttendanceAlerts: boolean }>;
}

export async function saveGuardianNotificationPreferencesMutation(
	input: GuardianNotificationPreferencesInput,
	options?: { current?: GuardianNotificationSettings; successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const { links, ...profile } = input;
	const result = await runMutation(() => client.commands.updateGuardianProfile({ ...profile, studentNotificationPreferences: links }), {
		successMessage: options?.successMessage,
		versionKeys: ['guardians', 'students', 'inbox'],
	});
	return result !== null;
}

export interface NotificationContactInput {
	notificationEmail?: string | null;
	notificationPhone?: string | null;
}

export async function saveNotificationContactMutation(
	input: NotificationContactInput,
	options?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.updateNotificationContact({
			notificationEmail: input.notificationEmail ?? null,
			notificationPhone: input.notificationPhone ?? null,
		}),
		{ successMessage: options?.successMessage, versionKeys: ['inbox'] },
	);
	return result !== null;
}

export async function markDeliveryReadMutation(deliveryId: string): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.markDeliveryRead({ deliveryId }),
		{ errorMessage: 'Unable to mark this message as read.', versionKeys: ['inbox'] },
	);
	return result !== null;
}
