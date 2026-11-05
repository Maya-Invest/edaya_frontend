import { describe, expect, test } from 'bun:test';
import type { Student } from '$lib/types/school';
import { studentMatchesSearchQuery } from '$lib/students/matches-student-search-query';

function student(overrides: Partial<Student> = {}): Student {
	return {
		id: '1',
		name: 'Kouadio Yao',
		email: 'kouadio@school.test',
		initials: 'KY',
		classId: 'class-a',
		birthdate: '2014-01-01',
		guardian: 'Guardian',
		average: 12,
		attendance: 90,
		status: 'active',
		photoUrl: null,
		...overrides,
	};
}

describe('studentMatchesSearchQuery', () => {
	test('matches name and email', () => {
		expect(studentMatchesSearchQuery(student(), 'kouadio')).toBe(true);
		expect(studentMatchesSearchQuery(student(), 'school.test')).toBe(true);
	});

	test('matches identifier case-insensitively', () => {
		expect(studentMatchesSearchQuery(student({ identifier: 'CI-2025-001' }), 'ci-2025-001')).toBe(true);
		expect(studentMatchesSearchQuery(student({ identifier: 'CI-2025-001' }), 'CI-2025')).toBe(true);
	});

	test('returns true for empty query', () => {
		expect(studentMatchesSearchQuery(student(), '')).toBe(true);
	});
});
