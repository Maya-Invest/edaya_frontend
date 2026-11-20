import { describe, expect, it } from 'bun:test';
import type { PermissionCode } from '$lib/auth/types';
import {
	activeTeacherDetailTab,
	TEACHER_DETAIL_TABS,
	visibleTeacherDetailTabs,
} from '../../../../../src/routes/(app)/school/teachers/lib/teacher-detail-tabs';

describe('teacher detail tabs', () => {
	it('registers the seven Teacher 360 tabs', () => {
		expect(TEACHER_DETAIL_TABS.map(tab => tab.segment)).toEqual([
			'profile',
			'assignments',
			'availability',
			'timetable',
			'evaluations',
			'family-feedback',
			'documents',
		]);
	});

	it('reads the active tab from the drawer path', () => {
		expect(activeTeacherDetailTab('/school/teachers/tch-1', 'tch-1')).toBe('profile');
		expect(activeTeacherDetailTab('/school/teachers/tch-1/timetable', 'tch-1')).toBe('timetable');
		expect(activeTeacherDetailTab('/school/teachers/tch-1/family-feedback', 'tch-1')).toBe('family-feedback');
	});

	it('hides gated tabs when the caller lacks the matching permission', () => {
		const granted = new Set<PermissionCode>(['GRADE_READ']);
		const visible = visibleTeacherDetailTabs(permissions =>
			permissions.some(permission => granted.has(permission)));
		expect(visible.map(tab => tab.key)).toEqual(['profile', 'assignments', 'evaluations']);
	});
});
