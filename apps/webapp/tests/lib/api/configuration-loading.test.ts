import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { fetchActivitySources } from '$lib/api/activities-data';
import { listAllEntityPages, schoolScopedEntityList } from '$lib/api/entity-list-filters';
import { fetchStaffMemberById, fetchStaffMembers, fetchStaffMembersPage } from '$lib/api/staff-data';
import { loadStaffPermissionAssignments } from '$lib/api/staff-permission-assignments-data';
import { fetchCatalogSubjectsSources } from '$lib/api/subjects-data';
import { createRecordingSchoolClient, entityCountRequests, entityListRequests } from '$tests/support/recording-school-client';

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

		expect(entityListRequests(requests, 'activities')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'activity-enrollments')[0]?.body).toMatchObject({
			activityId: { $in: ['activity-1'] },
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'class-activity-enrollments')[0]?.body).toMatchObject({
			activityId: { $in: ['activity-1'] },
			$limit: 500,
			$offset: 0,
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

		expect(entityListRequests(requests, 'staff-members')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
			accountKind: 'human',
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'class-groups')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'staff-assignments')[0]?.body).toMatchObject({
			staffId: { $in: ['staff-1'] },
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'subjects')).toHaveLength(0);
	});

	it('uses the same human-staff boundary for pagination and totals', async () => {
		const { client, requests } = createRecordingSchoolClient([[], { count: 0 }, []]);
		const page = await fetchStaffMembersPage(client, { schoolId: SEED_SCHOOL_ID, academicYearId }, { offset: 20, limit: 10 });
		expect(page).toMatchObject({ staff: [], totalStaff: 0 });
		expect(entityListRequests(requests, 'staff-members')[0]?.body).toMatchObject({ schoolId: SEED_SCHOOL_ID, accountKind: 'human', $offset: 20, $limit: 10 });
		expect(entityCountRequests(requests, 'staff-members')[0]?.body).toEqual({ schoolId: SEED_SCHOOL_ID, accountKind: 'human' });
	});

	it('does not open a service account in the human staff drawer or load its permission relations', async () => {
		const { client, requests } = createRecordingSchoolClient([[]]);
		expect(await fetchStaffMemberById(client, 'service-account', SEED_SCHOOL_ID)).toBeNull();
		expect(requests).toHaveLength(1);
		expect(entityListRequests(requests, 'staff-members')[0]?.body).toEqual({ id: 'service-account', schoolId: SEED_SCHOOL_ID, accountKind: 'human', $limit: 1 });
	});

	it('loads subjects catalog with school-scoped parents and child rows by those ids', async () => {
		const empty = listEnvelope([]);
		const { client, requests } = createRecordingSchoolClient([
			empty,
			empty,
			empty,
		]);

		await fetchCatalogSubjectsSources(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'grade-levels')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'class-groups')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'subjects')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'grade-level-subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'subject-matters')).toHaveLength(0);
		expect(entityListRequests(requests, 'grade-level-subject-matters')).toHaveLength(0);
	});

	it('lists grade-level-subjects and class-subjects by parent ids, not schoolId', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'gl-1',
				schoolId: SEED_SCHOOL_ID,
				name: '6e',
			}]),
			listEnvelope([{
				id: 'class-1',
				schoolId: SEED_SCHOOL_ID,
				gradeLevelId: 'gl-1',
			}]),
			listEnvelope([{
				id: 'subj-1',
				schoolId: SEED_SCHOOL_ID,
				name: 'Math',
			}]),
			listEnvelope([{
				id: 'gls-1',
				gradeLevelId: 'gl-1',
				subjectId: 'subj-1',
				academicYearId: 'year-1',
				isOptional: false,
			}]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		await fetchCatalogSubjectsSources(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'grade-level-subjects')[0]?.body).toMatchObject({
			gradeLevelId: { $in: ['gl-1'] },
		});
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toMatchObject({
			classGroupId: { $in: ['class-1'] },
		});
		expect(entityListRequests(requests, 'subject-matters')[0]?.body).toMatchObject({
			subjectId: { $in: ['subj-1'] },
		});
		expect(entityListRequests(requests, 'grade-level-subject-matters')[0]?.body).toMatchObject({
			gradeLevelSubjectId: { $in: ['gls-1'] },
		});
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
