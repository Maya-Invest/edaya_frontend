import { studentNote } from '$tests/support/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { mapHealthProfiles, mapNoteCategory, mapPedagogicalNotes } from '$lib/api/student-360-data';

const seedHealthProfiles = [
	{
		id: 'hp-s1',
		schoolId: SEED_SCHOOL_ID,
		studentId: 's1',
		bloodType: 'A+',
		allergies: 'Pollen',
		medicalConditions: 'Asthme',
		medications: undefined,
		clinicalNotes: 'Mild seasonal allergies.',
		lastVisit: '2026-02-14',
		createdAt: '2026-02-14',
		updatedAt: '2026-02-14',
	},
	{
		id: 'hp-s3',
		schoolId: SEED_SCHOOL_ID,
		studentId: 's3',
		bloodType: 'O-',
		allergies: 'Peanuts, Shellfish',
		medicalConditions: 'Asthme, Epilepsie',
		medications: 'EpiPen',
		clinicalNotes: 'Severe peanut allergy. EpiPen in nurse\'s office.',
		lastVisit: '2026-04-08',
		createdAt: '2026-04-08',
		updatedAt: '2026-04-08',
	},
];

const seedPedagogicalNotes = [
	studentNote({
		id: 'pn1',
		studentId: 's1',
		authorStaffId: 'st1',
		body: 'Très bonne progression en algèbre, raisonnement clair.',
		createdAt: '2026-05-12',
		updatedAt: '2026-05-12',
	}),
	studentNote({
		id: 'pn4',
		studentId: 's2',
		authorStaffId: 'st1',
		category: 'behavior',
		body: 'Bavardages réguliers en classe, vigilance demandée.',
		createdAt: '2026-05-05',
		updatedAt: '2026-05-05',
	}),
];

describe('student 360 pedagogical notes mapping', () => {
	it('maps API category enum to UI labels', () => {
		expect(mapNoteCategory('progress')).toBe('Progression');
		expect(mapNoteCategory('behavior')).toBe('Comportement');
		expect(mapNoteCategory('work')).toBe('Travail');
		expect(mapNoteCategory('encouragement')).toBe('Encouragement');
	});

	it('maps pedagogical notes from API fields', () => {
		const notes = mapPedagogicalNotes([...seedPedagogicalNotes]);

		expect(notes).toHaveLength(2);
		expect(notes.find(note => note.id === 'pn1')).toMatchObject({
			studentId: 's1',
			category: 'Progression',
			content: 'Très bonne progression en algèbre, raisonnement clair.',
		});
		expect(notes.find(note => note.id === 'pn4')).toMatchObject({
			studentId: 's2',
			category: 'Comportement',
		});
	});
});

describe('student 360 health mapping', () => {
	it('maps health fields from API without per-student tables', () => {
		const records = mapHealthProfiles([...seedHealthProfiles]);

		expect(records.s1).toMatchObject({
			bloodType: 'A+',
			allergies: ['Pollen'],
			medications: [],
			chronicConditions: ['Asthme'],
			lastVisit: '2026-02-14',
			notes: 'Mild seasonal allergies.',
		});
		expect(records.s3).toMatchObject({
			bloodType: 'O-',
			allergies: ['Peanuts', 'Shellfish'],
			medications: ['EpiPen'],
			chronicConditions: ['Asthme', 'Epilepsie'],
			lastVisit: '2026-04-08',
			notes: 'Severe peanut allergy. EpiPen in nurse\'s office.',
		});
	});
});
