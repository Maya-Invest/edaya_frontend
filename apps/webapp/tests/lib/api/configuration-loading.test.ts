import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { fetchActivitySources } from '$lib/api/activities-data';
import { listAllEntityPages, schoolScopedEntityList } from '$lib/api/entity-list-filters';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { loadStaffPermissionAssignments } from '$lib/api/staff-permission-assignments-data';
import { fetchCatalogSubjectsSources } from '$lib/api/subjects-data';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';

const academicYearId = 'year-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('configuration and activity loading', () => {
	it('keeps staff permission assignments school- and year-scoped', async () => {
		const { client, requests } = createRecordingSchoolClient([listEnvelope([])]);

		await loadStaffPermissionAssignments(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(entityListRequests(requests, 'staff-permission-assignments')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
			status: 'active',
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
			listEnvelope([]),
		]);

		await fetchActivitySources(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'activities')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'activity-enrollments')[0]?.body).toEqual({
			activityId: { $in: ['activity-1'] },
		});
		expect(entityListRequests(requests, 'class-activity-enrollments')[0]?.body).toEqual({
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
			{ id: SEED_SCHOOL_ID, ownerSubjectId: null },
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
		expect(entityListRequests(requests, 'staff-assignments')[0]?.body).toEqual({
			staffId: { $in: ['staff-1'] },
		});
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'subjects')).toHaveLength(0);
	});

	it('loads subjects catalog with school-scoped entity lists', async () => {
		const empty = listEnvelope([]);
		const { client, requests } = createRecordingSchoolClient([
			empty,
			empty,
			empty,
			empty,
			empty,
		]);

		await fetchCatalogSubjectsSources(client, SEED_SCHOOL_ID);

		for (const entity of [
			'grade-level-subjects',
			'class-subjects',
			'subjects',
			'subject-matters',
			'grade-level-subject-matters',
		]) {
			expect(entityListRequests(requests, entity)[0]?.body).toMatchObject({
				schoolId: SEED_SCHOOL_ID,
			});
		}
	});

	it('loads class grade levels with school-scoped class-groups list', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'class-1',
				schoolId: SEED_SCHOOL_ID,
				gradeLevelId: 'grade-level-1',
			}]),
		]);

		await listAllEntityPages(
			query => client.entities.classGroups.list(query),
			{ baseQuery: schoolScopedEntityList(SEED_SCHOOL_ID) },
		);

		expect(entityListRequests(requests, 'class-groups')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
		});
	});
});
