import type { Transport, TransportRequestOptions } from '@maya-invest/edaya-api-client';
import type { components } from '$lib/api/schema';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { ApiError, createSchoolClient } from '@maya-invest/edaya-api-client';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createRecordingSchoolClient } from '$tests/support/recording-school-client';

let recordingClient: ReturnType<typeof createRecordingSchoolClient>['client'];

mock.module('$lib/api/school-client', () => ({
	getBrowserSchoolClient: () => recordingClient,
}));

const { fetchSchoolNotificationTemplates } = await import('$lib/api/notification-templates-data');

describe('notification templates loading', () => {
	beforeEach(() => {
		recordingClient = createRecordingSchoolClient([]).client;
	});

	it('loads notification templates by school id via entity get', async () => {
		const { client, requests } = createRecordingSchoolClient([{
			schoolId: SEED_SCHOOL_ID,
			invitationSmsEnabled: false,
		}]);
		recordingClient = client;

		const document = await fetchSchoolNotificationTemplates(SEED_SCHOOL_ID);

		expect(document?.schoolId).toBe(SEED_SCHOOL_ID);
		expect(requests).toEqual([{
			method: 'GET',
			path: `/core/entities/school-notification-templates/${SEED_SCHOOL_ID}`,
		}]);
		expect(entityListRequests(requests, 'school-notification-templates')).toHaveLength(0);
	});

	it('returns null when the school document is missing', async () => {
		const requests: { method: string; path: string }[] = [];
		const transport: Transport = {
			async request<T>(method: string, path: string, _options?: TransportRequestOptions): Promise<T> {
				requests.push({ method, path });
				throw new ApiError(404, { message: 'not found' });
			},
		};
		recordingClient = createSchoolClient<components['schemas']>(transport);

		const document = await fetchSchoolNotificationTemplates(SEED_SCHOOL_ID);

		expect(document).toBeNull();
		expect(requests).toEqual([{
			method: 'GET',
			path: `/core/entities/school-notification-templates/${SEED_SCHOOL_ID}`,
		}]);
	});
});

function entityListRequests(
	requests: readonly { method: string; path: string }[],
	publicName: string,
) {
	return requests.filter(request =>
		request.method === 'POST' && request.path === `/core/entities/${publicName}/list`);
}
