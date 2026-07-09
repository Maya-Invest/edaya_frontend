import type { components } from '$lib/api/schema';
import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolNotificationTemplatesRow = components['schemas']['SchoolNotificationTemplates'];

export interface UpdateSchoolNotificationTemplatesInput {
	schoolId: string;
	templates: Record<string, unknown>;
	expectedUpdatedAt?: string | null;
}

export async function updateSchoolNotificationTemplatesMutation(
	input: UpdateSchoolNotificationTemplatesInput,
	options?: {
		successMessage?: string;
		onSuccess?: (result: SchoolNotificationTemplatesRow) => void | Promise<void>;
	},
): Promise<SchoolNotificationTemplatesRow | null> {
	const client = getBrowserSchoolClient();
	return runMutation(
		() => client.commands.updateSchoolNotificationTemplates(input),
		options,
	);
}

export async function resetSchoolNotificationTemplatesMutation(
	input: {
		schoolId: string;
		templateKey?: NotificationTemplateKey;
	},
	options?: {
		successMessage?: string;
		onSuccess?: (result: SchoolNotificationTemplatesRow) => void | Promise<void>;
	},
): Promise<SchoolNotificationTemplatesRow | null> {
	const client = getBrowserSchoolClient();
	return runMutation(
		() => client.commands.resetSchoolNotificationTemplates(input),
		options,
	);
}
