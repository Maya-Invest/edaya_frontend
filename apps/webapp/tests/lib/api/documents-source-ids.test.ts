import { describe, expect, test } from 'bun:test';
import { attendanceSheetSourceId, studentYearAccountSourceId } from '$lib/api/documents-source-ids';

describe('document source ids', () => {
	test('builds the student year account source id', () => {
		expect(studentYearAccountSourceId({
			schoolId: 'sch-1',
			studentId: 'stu-1',
			academicYearId: 'year-1',
			currency: 'XOF',
		})).toBe('sya:sch-1:stu-1:year-1:XOF');
	});

	test('builds the attendance sheet source id', () => {
		expect(attendanceSheetSourceId('cls-1', '2026-09-15')).toBe('cls-1:2026-09-15');
	});
});
