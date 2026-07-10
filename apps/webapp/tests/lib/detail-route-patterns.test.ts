import { describe, expect, it } from 'bun:test';
import {
	drawerTabRouteCacheKey,
	isLikelyDetailPath,
	listRouteCacheKey,
} from '$lib/detail-route-patterns';

describe('isLikelyDetailPath', () => {
	it('recognizes school student drawer tabs', () => {
		expect(isLikelyDetailPath('/school/students/stu-1')).toBe(true);
		expect(isLikelyDetailPath('/school/students/stu-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/students/stu-1/grades')).toBe(true);
		expect(isLikelyDetailPath('/school/students')).toBe(false);
	});
});

describe('listRouteCacheKey', () => {
	it('maps school student drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/students'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1/profile'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1/grades'))).toBe('/school/students');
		expect(listRouteCacheKey(new URL('http://local/school/students/stu-1/attendance?q=ada'))).toBe('/school/students');
	});

	it('still strips single-segment detail paths for other entities', () => {
		expect(listRouteCacheKey(new URL('http://local/school/guardians/g-1'))).toBe('/school/guardians');
	});
});

describe('drawerTabRouteCacheKey', () => {
	it('keeps pathname-specific keys separate from the list cache', () => {
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1'))).toBe('/school/students/stu-1');
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1/profile'))).toBe('/school/students/stu-1/profile');
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1/grades'))).toBe('/school/students/stu-1/grades');
	});
});
