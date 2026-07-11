import type { EffectiveGrantsSnapshot } from '$lib/auth/types';
import {
	CONFIG_NAV_DEFS,
	NAV_MODULE_DEFS,
	SCHOOL_NAV_DEFS,
} from '$lib/navigation/nav-catalog';
import {
	canAccessPath,
	COORDINATOR_NAV_PERMISSIONS,
	EDUCATOR_NAV_PERMISSIONS,
	filterNavItems,
	TEACHER_NAV_PERMISSIONS,
	visibleNavModuleKeys,
} from '$lib/navigation/nav-permissions';
import { describe, expect, it } from 'bun:test';

function mockGrants(permissions: readonly string[], isElevated = false): EffectiveGrantsSnapshot {
	return {
		isElevated,
		permissions: [...permissions],
		scopeGrants: [],
		scopeIdsByPermission: {},
	};
}

const teacherGrants = mockGrants(TEACHER_NAV_PERMISSIONS);
const coordinatorGrants = mockGrants(COORDINATOR_NAV_PERMISSIONS);
const educatorGrants = mockGrants(EDUCATOR_NAV_PERMISSIONS);
const elevatedGrants = mockGrants([], true);
const schoolCtx = { schoolId: 'sch1', classId: '6a' };

describe('nav-permissions — professeur (phase 3.2)', () => {
	it('shows school and classes modules only', () => {
		expect(visibleNavModuleKeys(teacherGrants, schoolCtx)).toEqual(['school', 'classes']);
	});

	it('hides staff, announcements, finance and configuration entries', () => {
		const schoolKeys = filterNavItems(SCHOOL_NAV_DEFS, teacherGrants).map(item => item.key);
		expect(schoolKeys).toEqual([
			'students',
			'guardians',
			'calendar',
			'timetablePlanning',
			'activities',
			'events',
		]);
		expect(schoolKeys).not.toContain('staff');
		expect(schoolKeys).not.toContain('announcements');

		expect(filterNavItems(NAV_MODULE_DEFS.finance, teacherGrants)).toHaveLength(0);
		expect(filterNavItems(NAV_MODULE_DEFS.configuration, teacherGrants)).toHaveLength(0);
	});

	it('shows all class tabs for the dev teacher profile', () => {
		expect(filterNavItems(NAV_MODULE_DEFS.classes, teacherGrants, { schoolId: 'sch1' })).toHaveLength(6);
	});

	it('blocks finance URLs and allows dashboard', () => {
		expect(canAccessPath('/dashboard', teacherGrants)).toBe(true);
		expect(canAccessPath('/school/students', teacherGrants)).toBe(true);
		expect(canAccessPath('/finance/billing', teacherGrants)).toBe(false);
		expect(canAccessPath('/school/announcements', teacherGrants)).toBe(false);
	});
});

describe('nav-permissions — prof principal (phase 3.3)', () => {
	it('shows school, classes and configuration modules', () => {
		expect(visibleNavModuleKeys(coordinatorGrants, schoolCtx)).toEqual([
			'school',
			'classes',
			'configuration',
		]);
	});

	it('shows full school menu including staff and announcements', () => {
		const schoolKeys = filterNavItems(SCHOOL_NAV_DEFS, coordinatorGrants).map(item => item.key);
		expect(schoolKeys).toEqual([
			'students',
			'guardians',
			'staff',
			'teachers',
			'calendar',
			'timetablePlanning',
			'activities',
			'announcements',
			'events',
		]);
	});

	it('shows configuration entries except finance', () => {
		expect(filterNavItems(NAV_MODULE_DEFS.finance, coordinatorGrants)).toHaveLength(0);
		expect(filterNavItems(CONFIG_NAV_DEFS, coordinatorGrants).map(item => item.key)).toEqual([
			'school',
			'academic',
			'gradeLevels',
			'classGroups',
			'subjects',
			'gradeScales',
			'reportCards',
			'notificationTemplates',
			'discipline',
		]);
	});

	it('allows staff and configuration URLs', () => {
		expect(canAccessPath('/school/staff', coordinatorGrants)).toBe(true);
		expect(canAccessPath('/school/announcements', coordinatorGrants)).toBe(true);
		expect(canAccessPath('/finance/billing', coordinatorGrants)).toBe(false);
	});
});

describe('nav-permissions — éducateur (phase 3.4)', () => {
	it('shows school and classes only', () => {
		expect(visibleNavModuleKeys(educatorGrants, schoolCtx)).toEqual(['school', 'classes']);
	});

	it('shows students, guardians and discipline events only in school menu', () => {
		const schoolKeys = filterNavItems(SCHOOL_NAV_DEFS, educatorGrants).map(item => item.key);
		expect(schoolKeys).toEqual(['students', 'guardians', 'events']);
	});

	it('blocks staff, finance and configuration URLs', () => {
		expect(canAccessPath('/school/staff', educatorGrants)).toBe(false);
		expect(canAccessPath('/configuration/academic', educatorGrants)).toBe(false);
		expect(canAccessPath('/finance/fees', educatorGrants)).toBe(false);
	});
});

describe('nav-permissions — directeur (phase 3.1)', () => {
	it('shows every module when elevated', () => {
		expect(visibleNavModuleKeys(elevatedGrants, schoolCtx)).toHaveLength(4);
		expect(filterNavItems(SCHOOL_NAV_DEFS, elevatedGrants)).toHaveLength(SCHOOL_NAV_DEFS.length);
	});
});
