import { describe, expect, test } from 'bun:test';
import {
	isSignedInStaffUrl,
	pathnameReachedSidebarTarget,
} from '../integration/demo-dry-run/support/paths';

describe('isSignedInStaffUrl', () => {
	test('accepts staff app routes and rejects login', () => {
		expect(isSignedInStaffUrl('http://localhost:5173/dashboard')).toBe(true);
		expect(isSignedInStaffUrl('http://localhost:5173/classes/c1/timetable')).toBe(true);
		expect(isSignedInStaffUrl('http://localhost:5173/login?panel=signin')).toBe(false);
		expect(isSignedInStaffUrl('http://localhost:5173/login/demo')).toBe(false);
	});
});

describe('pathnameReachedSidebarTarget', () => {
	test('matches the sidebar href and nested drawers', () => {
		expect(pathnameReachedSidebarTarget('/classes/c1/timetable', '/classes/c1/timetable')).toBe(true);
		expect(pathnameReachedSidebarTarget(
			'/classes/c1/timetable/sess/details',
			'/classes/c1/timetable',
		)).toBe(true);
		expect(pathnameReachedSidebarTarget('/dashboard', '/classes/c1/timetable')).toBe(false);
		expect(pathnameReachedSidebarTarget('/classes/c1/teaching', '/classes/c1/timetable')).toBe(false);
	});
});
