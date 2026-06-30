import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { loadStudent360Data } from './student-360-data';
import { createRecordingSchoolClient, entityListRequests } from './test/recording-school-client';

const studentId = 'student-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('student 360 data loading', () => {
	it('loads health profile and notes scoped to the selected student', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'hp-1',
				schoolId: SEED_SCHOOL_ID,
				studentId,
				bloodType: 'A+',
				allergies: 'Pollen',
				medicalConditions: 'Asthme',
				createdAt: '2026-02-14',
				updatedAt: '2026-02-14',
			}]),
			listEnvelope([{
				id: 'note-1',
				schoolId: SEED_SCHOOL_ID,
				studentId,
				authorStaffId: 'staff-1',
				category: 'progress',
				body: 'Strong progress in algebra.',
				createdAt: '2026-05-12',
				updatedAt: '2026-05-12',
			}]),
		]);

		const { healthRecord, pedagogicalNotes } = await loadStudent360Data(client, studentId);

		expect(healthRecord).toMatchObject({
			studentId,
			bloodType: 'A+',
		});
		expect(pedagogicalNotes).toHaveLength(1);
		expect(pedagogicalNotes[0]?.studentId).toBe(studentId);
		expect(entityListRequests(requests, 'student-health-profiles')[0]?.body).toEqual({ studentId });
		expect(entityListRequests(requests, 'student-notes')[0]?.body).toEqual({ studentId });
	});
});
