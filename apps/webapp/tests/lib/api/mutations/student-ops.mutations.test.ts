import { describe, expect, it } from 'bun:test';
import { studentHealthProfileCommand } from '$lib/api/mutations/student-ops.payload';

describe('studentHealthProfileCommand', () => {
	it('omits createdAt/updatedAt and normalizes lastVisit to ISO', () => {
		const payload = studentHealthProfileCommand({
			id: 'shp-s1',
			studentId: 's1',
			bloodType: 'A+',
			allergies: 'Pollen',
			medicalConditions: 'Asthme',
			medications: 'Ventoline',
			clinicalNotes: 'Note',
			lastVisit: '2026-02-14',
		});

		expect(payload).toMatchObject({
			id: 'shp-s1',
			studentId: 's1',
			bloodType: 'A+',
			allergies: 'Pollen',
			medicalConditions: 'Asthme',
			medications: 'Ventoline',
			clinicalNotes: 'Note',
		});
		expect(payload).not.toHaveProperty('updatedAt');
		expect(payload).not.toHaveProperty('createdAt');
		expect(typeof payload.lastVisit).toBe('string');
		expect(payload.lastVisit).toMatch(/^2026-02-14T/);
	});

	it('sends null lastVisit when the date is invalid or empty', () => {
		expect(studentHealthProfileCommand({
			studentId: 's2',
			lastVisit: 'not-a-date',
		})).toMatchObject({
			id: 'shp-s2',
			lastVisit: null,
		});

		expect(studentHealthProfileCommand({
			studentId: 's2',
			lastVisit: null,
		})).toMatchObject({
			lastVisit: null,
		});
	});
});
