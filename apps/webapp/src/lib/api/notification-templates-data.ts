import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export type SchoolNotificationTemplatesRow = components['schemas']['SchoolNotificationTemplates'];

export async function fetchSchoolNotificationTemplates(
	schoolId: string,
): Promise<SchoolNotificationTemplatesRow | null> {
	const client = getBrowserSchoolClient();
	const rows = await client.entities.schoolNotificationTemplates.list({ schoolId });
	return rows[0] ?? null;
}
