import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
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
			},
		]);

		const shell = await fetchAppShellData(client);

		expect(shell.studentCount).toBe(39);
		expect(shell.guardianCount).toBe(12);
		expect(shell.staffCount).toBe(5);
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
			},
		]);

		const counts = await fetchActiveEnrollmentCountsByClass(client, [classA, classB], SEED_SCHOOL_ID);

		expect(counts).toEqual({
			[classA]: 0,
			[classB]: 4,
		});
	});
});
