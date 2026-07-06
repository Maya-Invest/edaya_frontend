import { describe, expect, test } from 'bun:test';
import { studentDetailIdFromUrl } from '$lib/api/student-detail-url';

describe('studentDetailIdFromUrl', () => {
	test('reads school and class student detail ids', () => {
		expect(studentDetailIdFromUrl(new URL('https://app.example/school/students/stu-42'))).toBe('stu-42');
		expect(studentDetailIdFromUrl(new URL('https://app.example/classes/cg-1/students/stu-42'))).toBe('stu-42');
	});

	test('returns undefined on list routes', () => {
		expect(studentDetailIdFromUrl(new URL('https://app.example/school/students'))).toBeUndefined();
	});
});
