import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import { fetchActiveEnrollmentCountsByClass, fetchAppShellData } from '$lib/api/shell-data';
import {
	createRecordingSchoolClient,
	entityListRequests,
	queryRequests,
} from '$tests/support/recording-school-client';

const classA = 'class-6a';
const classB = 'class-6b';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('shell data loading', () => {
	it('uses one batched shell counts query instead of per-class enrollment counts', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: SEED_SCHOOL_ID,
				name: 'Demo School',
				city: 'Paris',
				timeZone: 'Europe/Paris',
			}]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{
				id: 'grade-6',
				schoolId: SEED_SCHOOL_ID,
				name: 'Sixième',
				cycle: 'Collège',
				order: 1,
			}]),
			listEnvelope([]),
			listEnvelope([
				{
					id: classA,
					schoolId: SEED_SCHOOL_ID,
					academicYearId: 'year-1',
					gradeLevelId: 'grade-6',
					name: '6A',
				},
				{
					id: classB,
					schoolId: SEED_SCHOOL_ID,
					academicYearId: 'year-1',
					gradeLevelId: 'grade-6',
					name: '6B',
				},
			]),
			{
				schoolId: SEED_SCHOOL_ID,
				activeEnrollmentCountsByClass: {
					[classA]: 18,
					[classB]: 21,
				},
				studentCount: 39,
				guardianCount: 12,
				staffCount: 5,
				teacherCount: 8,
			},
		]);

		const shell = await fetchAppShellData(client);

		expect(shell.studentCount).toBe(39);
		expect(shell.guardianCount).toBe(12);
		expect(shell.staffCount).toBe(5);
		expect(shell.teacherCount).toBe(8);
		expect(shell.classes.find(entry => entry.id === classA)?.studentCount).toBe(18);
		expect(shell.classes.find(entry => entry.id === classB)?.studentCount).toBe(21);
		expect(entityListRequests(requests, 'enrollments')).toHaveLength(0);
		expect(queryRequests(requests, 'get-app-shell-counts')).toEqual([
			{
				method: 'POST',
				path: '/core/queries/get-app-shell-counts',
				body: {
					schoolId: SEED_SCHOOL_ID,
					classGroupIds: [classA, classB],
				},
			},
		]);
	});

	it('fetchActiveEnrollmentCountsByClass returns zeroes for classes with no active enrollments', async () => {
		const { client } = createRecordingSchoolClient([
			{
				schoolId: SEED_SCHOOL_ID,
				activeEnrollmentCountsByClass: {
					[classA]: 0,
					[classB]: 4,
				},
				studentCount: 4,
				guardianCount: 0,
				staffCount: 0,
				teacherCount: 0,
			},
		]);

		const counts = await fetchActiveEnrollmentCountsByClass(client, [classA, classB], SEED_SCHOOL_ID);

		expect(counts).toEqual({
			[classA]: 0,
			[classB]: 4,
		});
	});

	it('scopes shell entity lists by fallbackSchoolId instead of unscoped schools/list', async () => {
		const { client, requests } = createRecordingSchoolClient([
			{
				id: SEED_SCHOOL_ID,
				name: 'Demo School',
				city: 'Paris',
				timeZone: 'Europe/Paris',
			},
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{
				id: 'grade-6',
				schoolId: SEED_SCHOOL_ID,
				name: 'Sixième',
				cycle: 'Collège',
				order: 1,
			}]),
			listEnvelope([]),
			listEnvelope([
				{
					id: classA,
					schoolId: SEED_SCHOOL_ID,
					academicYearId: 'year-1',
					gradeLevelId: 'grade-6',
					name: '6A',
				},
			]),
			{
				schoolId: SEED_SCHOOL_ID,
				activeEnrollmentCountsByClass: { [classA]: 18 },
				studentCount: 18,
				guardianCount: 4,
				staffCount: 2,
				teacherCount: 3,
			},
		]);

		const shell = await fetchAppShellData(client, { fallbackSchoolId: SEED_SCHOOL_ID });

		expect(shell.schools).toHaveLength(1);
		expect(shell.schools[0]?.id).toBe(SEED_SCHOOL_ID);
		expect(shell.classes).toHaveLength(1);
		expect(entityListRequests(requests, 'schools')).toHaveLength(0);
		expect(requests.some(request =>
			request.method === 'GET' && request.path === `/core/entities/schools/${SEED_SCHOOL_ID}`)).toBe(true);
		expect(entityListRequests(requests, 'academic-years')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'class-groups')[0]?.body).toMatchObject({
			schoolId: SEED_SCHOOL_ID,
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
	});

	it('maps academic year status verbatim from API', async () => {
		const { client } = createRecordingSchoolClient([
			{
				id: SEED_SCHOOL_ID,
				name: 'Demo School',
				city: 'Paris',
				timeZone: 'Europe/Paris',
			},
			listEnvelope([
				{
					id: 'year-draft',
					schoolId: SEED_SCHOOL_ID,
					name: 'Draft year',
					startDate: '2026-09-01',
					endDate: '2027-06-30',
					status: 'draft',
				},
				{
					id: 'year-published',
					schoolId: SEED_SCHOOL_ID,
					name: 'Published year',
					startDate: '2025-09-01',
					endDate: '2026-06-30',
					status: 'published',
				},
				{
					id: 'year-archived',
					schoolId: SEED_SCHOOL_ID,
					name: 'Archived year',
					startDate: '2024-09-01',
					endDate: '2025-06-30',
					status: 'archived',
				},
			]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			{
				schoolId: SEED_SCHOOL_ID,
				activeEnrollmentCountsByClass: {},
				studentCount: 0,
				guardianCount: 0,
				staffCount: 0,
				teacherCount: 0,
			},
		]);

		const shell = await fetchAppShellData(client, { fallbackSchoolId: SEED_SCHOOL_ID });
		const statusById = Object.fromEntries(shell.academicYears.map(year => [year.id, year.status]));

		expect(statusById['year-draft']).toBe('draft');
		expect(statusById['year-published']).toBe('published');
		expect(statusById['year-archived']).toBe('archived');
	});

	it('includes the 51st class group instead of stopping at the default list page', async () => {
		const classGroups = Array.from({ length: 51 }, (_, index) => ({
			id: `class-${index + 1}`,
			schoolId: SEED_SCHOOL_ID,
			academicYearId: 'year-1',
			gradeLevelId: 'grade-6',
			name: `Class ${index + 1}`,
		}));

		const { client, requests } = createRecordingSchoolClient([
			{
				id: SEED_SCHOOL_ID,
				name: 'Demo School',
				city: 'Paris',
				timeZone: 'Europe/Paris',
			},
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{
				id: 'grade-6',
				schoolId: SEED_SCHOOL_ID,
				name: 'Sixième',
				cycle: 'Collège',
				order: 1,
			}]),
			listEnvelope([]),
			listEnvelope(classGroups),
			{
				schoolId: SEED_SCHOOL_ID,
				activeEnrollmentCountsByClass: Object.fromEntries(classGroups.map(entry => [entry.id, 1])),
				studentCount: 51,
				guardianCount: 0,
				staffCount: 0,
				teacherCount: 0,
			},
		]);

		const shell = await fetchAppShellData(client, { fallbackSchoolId: SEED_SCHOOL_ID });

		expect(shell.classes).toHaveLength(51);
		expect(shell.classes.at(-1)?.id).toBe('class-51');
		expect(entityListRequests(requests, 'class-groups')[0]?.body).toMatchObject({
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
	});
});
