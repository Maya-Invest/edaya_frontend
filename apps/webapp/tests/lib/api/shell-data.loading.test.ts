import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { fetchActiveEnrollmentCountsByClass, fetchAppShellData } from '$lib/api/shell-data';
import {
	createRecordingSchoolClient,
	entityCountRequests,
	entityListRequests,
} from '$tests/support/recording-school-client';

const classA = 'class-6a';
const classB = 'class-6b';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('shell data loading', () => {
	it('uses enrollment count queries per class instead of loading all enrollments', async () => {
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
			{ count: 18 },
			{ count: 21 },
			{ count: 39 },
			{ count: 12 },
			{ count: 5 },
		]);

		const shell = await fetchAppShellData(client);

		expect(shell.studentCount).toBe(39);
		expect(shell.guardianCount).toBe(12);
		expect(shell.staffCount).toBe(5);
		expect(shell.classes.find(entry => entry.id === classA)?.studentCount).toBe(18);
		expect(shell.classes.find(entry => entry.id === classB)?.studentCount).toBe(21);
		expect(entityListRequests(requests, 'enrollments')).toHaveLength(0);
		expect(entityCountRequests(requests, 'enrollments')).toEqual([
			{
				method: 'POST',
				path: '/core/entities/enrollments/count',
				body: { classGroupId: classA, status: 'active' },
			},
			{
				method: 'POST',
				path: '/core/entities/enrollments/count',
				body: { classGroupId: classB, status: 'active' },
			},
		]);
		expect(entityCountRequests(requests, 'students')).toHaveLength(1);
		expect(entityCountRequests(requests, 'guardians')).toHaveLength(1);
		expect(entityCountRequests(requests, 'staff-members')).toHaveLength(1);
	});

	it('fetchActiveEnrollmentCountsByClass returns zeroes for classes with no active enrollments', async () => {
		const { client } = createRecordingSchoolClient([
			{ count: 0 },
			{ count: 4 },
		]);

		const counts = await fetchActiveEnrollmentCountsByClass(client, [classA, classB]);

		expect(counts).toEqual({
			[classA]: 0,
			[classB]: 4,
		});
	});
});
