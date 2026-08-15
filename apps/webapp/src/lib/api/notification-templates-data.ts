import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { ApiError } from '@maya-invest/edaya-api-client';

export type SchoolNotificationTemplatesRow = components['schemas']['SchoolNotificationTemplates'];

export async function fetchSchoolNotificationTemplates(
	schoolId: string,
): Promise<SchoolNotificationTemplatesRow | null> {
	const client = getBrowserSchoolClient();
	try {
		return await client.entities.schoolNotificationTemplates.get(schoolId);
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null;
		}
		throw error;
	}
}
