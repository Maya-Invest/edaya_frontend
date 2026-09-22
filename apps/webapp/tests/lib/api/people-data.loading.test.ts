import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import { loadClassPeopleData, loadGuardiansPeopleData, loadPeopleData, loadPeopleDataPage } from '$lib/api/people-data';
import { createRecordingSchoolClient, entityCountRequests, entityListRequests } from '$tests/support/recording-school-client';

const classGroupId = 'class-7a';
const periodId = 'period-1';

const enrollment = {
	id: 'enrollment-1',
	schoolId: SEED_SCHOOL_ID,
	studentId: 'student-1',
	classGroupId,
	academicYearId: 'year-1',
	status: 'active',
	enrolledAt: '2026-09-01',
	createdAt: '2026-09-01',
	updatedAt: '2026-09-01',
} as const;

const student = {
	id: 'student-1',
	schoolId: SEED_SCHOOL_ID,
	firstName: 'Ada',
	lastName: 'Lovelace',
	birthDate: '2014-03-15',
	status: 'active',
	createdAt: '2026-09-01',
	updatedAt: '2026-09-01',
} as const;

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

function paged(body: Record<string, unknown>) {
	return {
		...body,
		$limit: CATALOG_LIST_PAGE_SIZE,
		$offset: 0,
	};
}

describe('people data loading', () => {
	it('loads class students with scoped list filters instead of school-wide reads', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([enrollment]),
			listEnvelope([student]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{
				id: 'assessment-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				classSubjectId: 'cs-math',
				periodId,
				title: 'Quiz',
				maxScore: 20,
			}]),
			listEnvelope([]),
		]);

		const { students } = await loadClassPeopleData(client, classGroupId, periodId);

		expect(students).toHaveLength(1);
		expect(students[0]?.id).toBe('student-1');
		expect(students[0]?.classId).toBe(classGroupId);

		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual(paged({
			classGroupId,
			status: 'active',
		}));
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual(paged({
			id: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'guardian-links')[0]?.body).toEqual(paged({
			studentId: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'attendance')[0]?.body).toEqual(paged({
			studentId: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'assessments')[0]?.body).toEqual(paged({
			classGroupId,
			periodId,
		}));
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toEqual(paged({
			assessmentId: { $in: ['assessment-1'] },
			studentId: { $in: ['student-1'] },
		}));

		for (const request of entityListRequests(requests, 'students')) {
			expect(request.body).not.toEqual({});
		}
	});

	it('scopes school roster enrollments and links to returned students instead of schoolId dumps', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([student]),
			listEnvelope([enrollment]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		await loadPeopleData(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'students')).toHaveLength(1);
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
			$orderBy: [
				{ field: 'lastName', direction: 'asc' },
				{ field: 'firstName', direction: 'asc' },
			],
		});
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual({
			studentId: { $in: ['student-1'] },
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'guardian-links')[0]?.body).toEqual({
			studentId: { $in: ['student-1'] },
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'guardians')).toHaveLength(0);
		expect(entityListRequests(requests, 'attendance')[0]?.body).toEqual(paged({
			studentId: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toEqual(paged({
			studentId: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'assessments')).toHaveLength(0);
	});

	it('keeps inactive students in the school roster so status filters can apply client-side', async () => {
		const inactiveStudent = {
			...student,
			id: 'student-inactive',
			status: 'inactive',
			firstName: 'Ina',
			lastName: 'Active',
		} as const;

		const { client } = createRecordingSchoolClient([
			listEnvelope([inactiveStudent]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		const { students } = await loadPeopleData(client, SEED_SCHOOL_ID);

		expect(students).toHaveLength(1);
		expect(students[0]?.id).toBe('student-inactive');
		expect(students[0]?.status).toBe('inactive');
	});

	it('loads school roster assessment metadata only for assessments referenced by student results', async () => {
		const assessment = {
			id: 'assessment-1',
			schoolId: SEED_SCHOOL_ID,
			classGroupId,
			classSubjectId: 'cs-math',
			periodId,
			title: 'Quiz',
			maxScore: 20,
			coefficient: 1,
		};
		const result = {
			id: 'result-1',
			schoolId: SEED_SCHOOL_ID,
			assessmentId: 'assessment-1',
			studentId: 'student-1',
			score: 16,
		};

		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([student]),
			listEnvelope([enrollment]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([result]),
			listEnvelope([assessment]),
		]);

		const { students } = await loadPeopleData(client, SEED_SCHOOL_ID);

		expect(students[0]?.average).toBe(16);
		expect(entityListRequests(requests, 'assessments')[0]?.body).toEqual(paged({
			id: { $in: ['assessment-1'] },
		}));
	});

	it('loads guardians with linked students only instead of the full school roster', async () => {
		const guardian = {
			id: 'guardian-1',
			schoolId: SEED_SCHOOL_ID,
			firstName: 'Grace',
			lastName: 'Hopper',
			email: 'grace@school.edu',
			contactMethods: [],
		};
		const link = {
			id: 'link-1',
			schoolId: SEED_SCHOOL_ID,
			guardianId: 'guardian-1',
			studentId: 'student-1',
			relationship: 'mother',
			legalGuardian: true,
			isPrimary: true,
		};

		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([guardian]),
			listEnvelope([link]),
			listEnvelope([student]),
			listEnvelope([enrollment]),
		]);

		const { guardians, students } = await loadGuardiansPeopleData(client, SEED_SCHOOL_ID);

		expect(guardians).toHaveLength(1);
		expect(students).toHaveLength(1);
		expect(students[0]?.id).toBe('student-1');
		expect(entityListRequests(requests, 'guardians')[0]?.body).toEqual(paged({ schoolId: SEED_SCHOOL_ID }));
		expect(entityListRequests(requests, 'guardian-links')[0]?.body).toEqual(paged({
			guardianId: { $in: ['guardian-1'] },
		}));
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual(paged({
			id: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual(paged({
			studentId: { $in: ['student-1'] },
		}));
		expect(entityListRequests(requests, 'attendance')).toHaveLength(0);
		expect(entityListRequests(requests, 'assessments')).toHaveLength(0);
	});

	it('paginates school students by class enrollment instead of the full roster', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([enrollment]),
			{ count: 1 },
			listEnvelope([student]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		const result = await loadPeopleDataPage(client, {
			schoolId: SEED_SCHOOL_ID,
			classGroupId,
			offset: 0,
			limit: 25,
		});

		expect(result.students).toHaveLength(1);
		expect(result.totalStudents).toBe(1);
		expect(result.totalStudents).toBe(1);
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual({
			classGroupId,
			status: 'active',
			$limit: 25,
			$offset: 0,
			$orderBy: [{ field: 'studentId', direction: 'asc' }],
		});
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual(paged({
			id: { $in: ['student-1'] },
		}));
		expect(entityCountRequests(requests, 'enrollments')[0]?.body).toEqual({
			classGroupId,
			status: 'active',
		});
	});

	it('keeps class roster enrollment lists class-scoped while school roster enrollments follow student ids', async () => {
		const classResponses = [
			listEnvelope([enrollment]),
			listEnvelope([student]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		];
		const schoolResponses = [
			listEnvelope([student]),
			listEnvelope([enrollment]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		];

		const classLoad = createRecordingSchoolClient([...classResponses]);
		await loadClassPeopleData(classLoad.client, classGroupId, periodId);

		const schoolLoad = createRecordingSchoolClient([...schoolResponses]);
		await loadPeopleData(schoolLoad.client, SEED_SCHOOL_ID);

		expect(entityListRequests(classLoad.requests, 'enrollments')[0]?.body).toEqual(paged({
			classGroupId,
			status: 'active',
		}));
		expect(entityListRequests(schoolLoad.requests, 'enrollments')[0]?.body).toEqual({
			studentId: { $in: ['student-1'] },
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
	});
});
