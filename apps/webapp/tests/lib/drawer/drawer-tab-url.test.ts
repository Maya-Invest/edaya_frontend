import { describe, expect, it } from 'bun:test';
import {
	appendDrawerTab,
	DRAWER_TAB_QUERY_KEY,
	readDrawerTab,
	writeDrawerTab,
} from '$lib/drawer/drawer-tab-url';

const allowed = ['profile', 'grades', 'attendance'] as const;

describe('readDrawerTab', () => {
	it('returns the default tab when the query param is missing', () => {
		const url = new URL('http://local/school/students/stu-1');
		expect(readDrawerTab(url, allowed, 'profile')).toBe('profile');
	});

	it('returns a valid tab from the query param', () => {
		const url = new URL('http://local/school/students/stu-1?tab=grades');
		expect(readDrawerTab(url, allowed, 'profile')).toBe('grades');
	});

	it('falls back to the default tab for unknown values', () => {
		const url = new URL('http://local/school/students/stu-1?tab=unknown');
		expect(readDrawerTab(url, allowed, 'profile')).toBe('profile');
	});
});

describe('writeDrawerTab', () => {
	it('omits the query param for the default tab', () => {
		const url = new URL('http://local/school/students/stu-1?tab=grades&q=ada');
		expect(writeDrawerTab(url, 'profile', 'profile')).toBe('/school/students/stu-1?q=ada');
	});

	it('sets the query param for non-default tabs', () => {
		const url = new URL('http://local/school/students/stu-1?q=ada');
		expect(writeDrawerTab(url, 'attendance', 'profile')).toBe('/school/students/stu-1?q=ada&tab=attendance');
	});

	it('replaces an existing tab value', () => {
		const url = new URL(`http://local/school/students/stu-1?${DRAWER_TAB_QUERY_KEY}=grades`);
		expect(writeDrawerTab(url, 'attendance', 'profile')).toBe('/school/students/stu-1?tab=attendance');
	});
});

describe('appendDrawerTab', () => {
	it('returns the href unchanged for the default tab', () => {
		expect(appendDrawerTab('/school/students/stu-1', 'profile', 'profile')).toBe('/school/students/stu-1');
	});

	it('appends the tab query param for non-default tabs', () => {
		expect(appendDrawerTab('/school/students/stu-1', 'grades', 'profile')).toBe('/school/students/stu-1?tab=grades');
	});
});
