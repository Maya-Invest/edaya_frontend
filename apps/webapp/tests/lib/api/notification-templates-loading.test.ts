import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
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
		const templates = { welcome: { subject: 'Hello', body: 'World' } };
		const { client, requests } = createRecordingSchoolClient([{
			schoolId: SEED_SCHOOL_ID,
			templates,
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
});

function entityListRequests(
	requests: readonly { method: string; path: string }[],
	publicName: string,
) {
	return requests.filter(request =>
		request.method === 'POST' && request.path === `/core/entities/${publicName}/list`);
}
