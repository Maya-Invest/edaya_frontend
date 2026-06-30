import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { loadAccessRolesData } from './access-roles-data';
import { fetchActivitySources } from './activities-data';
import { fetchStaffMembers } from './staff-data';
import { createRecordingSchoolClient, entityListRequests } from './test/recording-school-client';

const academicYearId = 'year-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('configuration and activity loading', () => {
	it('keeps access roles school-scoped', async () => {
		const { client, requests } = createRecordingSchoolClient([listEnvelope([])]);

		await loadAccessRolesData(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'access-roles')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
		});
	});

	it('loads activity enrollments only for returned school activities', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'activity-1',
				schoolId: SEED_SCHOOL_ID,
				name: 'Robotics',
				category: 'Science',
				coach: 'Teacher',
				schedule: 'Friday',
				participants: 0,
				capacity: 20,
				description: 'Club',
				startDate: '2026-01-01',
				endDate: '2026-06-01',
			}]),
			listEnvelope([]),
		]);

		await fetchActivitySources(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'activities')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'activity-enrollments')[0]?.body).toEqual({
			activityId: { $in: ['activity-1'] },
		});
	});

	it('loads staff relations only for school staff and active-year classes', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'staff-1',
				schoolId: SEED_SCHOOL_ID,
				firstName: 'Grace',
				lastName: 'Hopper',
				isActive: true,
			}]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		await fetchStaffMembers(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(entityListRequests(requests, 'staff-members')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'class-groups')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});
		expect(entityListRequests(requests, 'staff-role-assignments')[0]?.body).toEqual({
			staffId: { $in: ['staff-1'] },
		});
		expect(entityListRequests(requests, 'staff-assignments')[0]?.body).toEqual({
			staffId: { $in: ['staff-1'] },
		});
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'subjects')).toHaveLength(0);
	});
});
