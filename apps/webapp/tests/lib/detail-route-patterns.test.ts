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

	it('recognizes school staff drawer tabs', () => {
		expect(isLikelyDetailPath('/school/staff/stf-1')).toBe(true);
		expect(isLikelyDetailPath('/school/staff/stf-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/staff/stf-1/permissions')).toBe(true);
		expect(isLikelyDetailPath('/school/staff')).toBe(false);
	});

	it('recognizes school teacher drawer tabs', () => {
		expect(isLikelyDetailPath('/school/teachers/tch-1')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/assignments')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers/tch-1/availability')).toBe(true);
		expect(isLikelyDetailPath('/school/teachers')).toBe(false);
	});

	it('recognizes school activity drawer tabs', () => {
		expect(isLikelyDetailPath('/school/activities/act-1')).toBe(true);
		expect(isLikelyDetailPath('/school/activities/act-1/profile')).toBe(true);
		expect(isLikelyDetailPath('/school/activities/act-1/students')).toBe(true);
		expect(isLikelyDetailPath('/school/activities/act-1/classes')).toBe(true);
		expect(isLikelyDetailPath('/school/activities')).toBe(false);
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

	it('maps school staff drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/staff'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1/profile'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1/permissions'))).toBe('/school/staff');
		expect(listRouteCacheKey(new URL('http://local/school/staff/stf-1/assignments'))).toBe('/school/staff');
	});

	it('maps school teacher drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/teachers'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1/profile'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1/assignments'))).toBe('/school/teachers');
		expect(listRouteCacheKey(new URL('http://local/school/teachers/tch-1/availability'))).toBe('/school/teachers');
	});

	it('maps school activity drawer paths to the list route', () => {
		expect(listRouteCacheKey(new URL('http://local/school/activities'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1/profile'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1/students'))).toBe('/school/activities');
		expect(listRouteCacheKey(new URL('http://local/school/activities/act-1/classes'))).toBe('/school/activities');
	});
});

describe('drawerTabRouteCacheKey', () => {
	it('keeps pathname-specific keys separate from the list cache', () => {
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1'))).toBe('/school/students/stu-1');
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1/profile'))).toBe('/school/students/stu-1/profile');
		expect(drawerTabRouteCacheKey(new URL('http://local/school/students/stu-1/grades'))).toBe('/school/students/stu-1/grades');
	});
});
