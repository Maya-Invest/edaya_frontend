import { describe, expect, test } from 'bun:test';
import { studentPickerSearchText, studentPickerSubtitle } from '$lib/students/format-student-picker-subtitle';

describe('studentPickerSubtitle', () => {
	test('joins class and identifier', () => {
		expect(studentPickerSubtitle({
			classLabel: '3ème A',
			identifier: 'CI-2025-001',
		})).toBe('3ème A · CI-2025-001');
	});

	test('falls back to class only when identifier is missing', () => {
		expect(studentPickerSubtitle({ classLabel: '6ème B' })).toBe('6ème B');
	});

	test('falls back to identifier only when class is missing', () => {
		expect(studentPickerSubtitle({ identifier: 'CI-2025-002' })).toBe('CI-2025-002');
	});
});

describe('studentPickerSearchText', () => {
	test('includes identifier for search', () => {
		expect(studentPickerSearchText({
			email: 'a@school.edu',
			classLabel: '3ème A',
			identifier: 'CI-2025-001',
		})).toContain('CI-2025-001');
	});
});
