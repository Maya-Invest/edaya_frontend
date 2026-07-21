import { describe, expect, it } from 'vitest';
import { studentPickerSearchText, studentPickerSubtitle } from '$lib/students/format-student-picker-subtitle';

describe('studentPickerSubtitle', () => {
	it('joins class and matricule', () => {
		expect(studentPickerSubtitle({
			classLabel: '3ème A',
			matricule: 'CI-2025-001',
		})).toBe('3ème A · CI-2025-001');
	});

	it('falls back to class only when matricule is missing', () => {
		expect(studentPickerSubtitle({ classLabel: '6ème B' })).toBe('6ème B');
	});

	it('falls back to matricule only when class is missing', () => {
		expect(studentPickerSubtitle({ matricule: 'CI-2025-002' })).toBe('CI-2025-002');
	});
});

describe('studentPickerSearchText', () => {
	it('includes matricule for search', () => {
		expect(studentPickerSearchText({
			email: 'a@school.edu',
			classLabel: '3ème A',
			matricule: 'CI-2025-001',
		})).toContain('CI-2025-001');
	});
});
