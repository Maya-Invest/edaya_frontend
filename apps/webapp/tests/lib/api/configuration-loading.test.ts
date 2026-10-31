import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';
import type { StaffPermissionProfile } from '$lib/api/staff-permission-profiles-data';
import { fetchActivitySources } from '$lib/api/activities-data';
import { listAllEntityPages, schoolScopedEntityList } from '$lib/api/entity-list-filters';
import { fetchStaffMemberById, fetchStaffMembers, fetchStaffMembersPage } from '$lib/api/staff-data';
import { loadStaffPermissionAssignments } from '$lib/api/staff-permission-assignments-data';
import { loadStaffPermissionFormData } from '$lib/api/staff-permission-profiles-data';
import { loadSubjectCategories } from '$lib/api/subject-categories-data';
import { fetchCatalogSubjectsSources } from '$lib/api/subjects-data';
import { createRecordingSchoolClient, entityCountRequests, entityListRequests } from '$tests/support/recording-school-client';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';

const academicYearId = 'year-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('configuration and activity loading', () => {
	it('loads creation profiles and their mixed scope metadata together on a cold page', async () => {
		const profiles: StaffPermissionProfile[] = [{ id: 'mixed', schoolId: SEED_SCHOOL_ID, name: 'Mixed', permissions: ['PAYMENT_READ', 'GRADE_MANAGE'] }];
		const base = { staffAssignable: true, serviceAccountAssignable: true, s2sAccess: 'read' as const, humanOnly: false, minimumAssurance: 'standard' as const, assignmentTargets: [] };
		const catalog: PermissionCatalogEntry[] = [{ ...base, permission: 'PAYMENT_READ', scopePolicy: { mode: 'resources', allowedKinds: ['student'], allowAll: true } }, { ...base, permission: 'GRADE_MANAGE', scopePolicy: { mode: 'resources', allowedKinds: ['class_group'], allowAll: true } }];
		const { client, requests } = createRecordingSchoolClient([listEnvelope(profiles), { items: catalog }]);
		const loaded = await loadStaffPermissionFormData(client, SEED_SCHOOL_ID);
		expect(loaded.profiles).toEqual(profiles);
		expect(loaded.catalog).toEqual(catalog);
		expect(requests).toHaveLength(2);
	});
	for (const size of [51, 501]) {
		it(`loads all ${size} subject categories through the generated client`, async () => {
			const categories = Array.from({ length: size }, (_, index) => ({ id: `category-${index}`, schoolId: SEED_SCHOOL_ID, name: `Category ${index}` }));
			const pages = [listEnvelope(categories.slice(0, 500))];
			if (size > 500)
				pages.push(listEnvelope(categories.slice(500)));
			const { client, requests } = createRecordingSchoolClient(pages);
			const loaded = await loadSubjectCategories(client, SEED_SCHOOL_ID);
			expect(loaded).toHaveLength(size);
			expect(new Set(loaded.map(category => category.id)).size).toBe(size);
			const lists = entityListRequests(requests, 'subject-categories');
			expect(lists.map(request => (request.body as Record<string, unknown>).$offset)).toEqual(size > 500 ? [0, 500] : [0]);
			expect(lists.every(request => (request.body as Record<string, unknown>).schoolId === SEED_SCHOOL_ID && (request.body as Record<string, unknown>).$limit === 500)).toBe(true);
		});
	}
	it('keeps staff permission assignments school- and year-scoped', async () => {
		const { client, requests } = createRecordingSchoolClient([listEnvelope([]), listEnvelope([])]);

		await loadStaffPermissionAssignments(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(entityListRequests(requests, 'staff-permission-assignments')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
			status: 'active',
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'staff-manual-permission-assignments')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
	});

	it('loads manual permission sources beyond the first page, including unresolved selections', async () => {
		const sources = Array.from({ length: 501 }, (_, index) => ({
			id: `manual-${index}`,
			staffId: 'staff-1',
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
			permission: 'GRADE_READ' as const,
			customScopes: [],
			useDefaultScopes: true,
			warnings: [{ permission: 'GRADE_READ' as const, reason: 'missing_scope' as const }],
		}));
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([]),
			listEnvelope(sources.slice(0, 500)),
			listEnvelope(sources.slice(500)),
		]);
		const loaded = await loadStaffPermissionAssignments(client, { schoolId: SEED_SCHOOL_ID, academicYearId });
		expect(loaded).toHaveLength(501);
		expect(loaded[500]?.id).toBe('manual-500');
		expect(loaded[500]?.scopes).toEqual([]);
		expect(loaded[500]?.warnings).toEqual(sources[500]?.warnings);
		expect(entityListRequests(requests, 'staff-manual-permission-assignments').map(request => (request.body as Record<string, unknown>).$offset)).toEqual([0, 500]);
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

	it('loads subjects directly and skips children when the catalogue is empty', async () => {
		const { client, requests } = createRecordingSchoolClient([[], []]);
		await fetchCatalogSubjectsSources(client, SEED_SCHOOL_ID);
		expect(entityListRequests(requests, 'subjects')[0]?.body).toMatchObject({ schoolId: SEED_SCHOOL_ID });
		expect(entityListRequests(requests, 'class-groups')).toHaveLength(0);
		expect(entityListRequests(requests, 'class-subjects')).toHaveLength(0);
	});
	it('loads offerings and chapters by subject ids', async () => {
		const { client, requests } = createRecordingSchoolClient([listEnvelope([{ id: 'subject-1', schoolId: SEED_SCHOOL_ID, gradeLevelId: 'grade', academicYearId: 'year', name: 'Math' }]), [], [], []]);
		await fetchCatalogSubjectsSources(client, SEED_SCHOOL_ID);
		for (const entity of ['class-subjects', 'subject-matters'])
			expect(entityListRequests(requests, entity)[0]?.body).toMatchObject({ subjectId: { $in: ['subject-1'] } });
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






