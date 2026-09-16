import type { ActionGrantsSnapshot, PermissionCode } from '$lib/auth/types';
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

function mockGrants(permissions: readonly PermissionCode[]): ActionGrantsSnapshot {
	return permissions.map(permission => ({ permission, scopes: [{ kind: 'school' }], source: 'manual' }));
}

const teacherGrants = mockGrants(TEACHER_NAV_PERMISSIONS);
const coordinatorGrants = mockGrants(COORDINATOR_NAV_PERMISSIONS);
const educatorGrants = mockGrants(EDUCATOR_NAV_PERMISSIONS);
const elevatedGrants = mockGrants(Object.values(NAV_MODULE_DEFS).flatMap(items => items.flatMap(item => item.permissions ?? [])));
const schoolCtx = { schoolId: 'sch1', classId: '6a' };

describe('nav-permissions — professeur (phase 3.2)', () => {
	it('shows school and classes modules only', () => {
		expect(visibleNavModuleKeys(teacherGrants, schoolCtx)).toEqual(['school', 'classes']);
	});

	it('keeps personal announcements visible while hiding administrative entries', () => {
		const schoolKeys = filterNavItems(SCHOOL_NAV_DEFS, teacherGrants).map(item => item.key);
		expect(schoolKeys).toEqual([
			'students',
			'guardians',
			'calendar',
			'activities',
			'announcements',
			'events',
		]);
		expect(schoolKeys).not.toContain('staff');
		expect(schoolKeys).toContain('announcements');

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
		expect(canAccessPath('/school/announcements', teacherGrants)).toBe(true);
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
			'permissionProfiles',
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

	it('shows personal announcements alongside permitted school entries', () => {
		const schoolKeys = filterNavItems(SCHOOL_NAV_DEFS, educatorGrants).map(item => item.key);
		expect(schoolKeys).toEqual(['students', 'guardians', 'announcements', 'events']);
		expect(canAccessPath('/school/calendar', educatorGrants)).toBe(false);
	});

	it('blocks staff, finance and configuration URLs', () => {
		expect(canAccessPath('/school/staff', educatorGrants)).toBe(false);
		expect(canAccessPath('/configuration/academic', educatorGrants)).toBe(false);
		expect(canAccessPath('/finance/fees', educatorGrants)).toBe(false);
		expect(canAccessPath('/finance/billing', educatorGrants)).toBe(false);
	});
});

describe('nav-permissions — directeur (phase 3.1)', () => {
	it('shows every module when those actions are granted', () => {
		expect(visibleNavModuleKeys(elevatedGrants, schoolCtx)).toHaveLength(4);
		expect(filterNavItems(SCHOOL_NAV_DEFS, elevatedGrants)).toHaveLength(SCHOOL_NAV_DEFS.length);
	});

	it('allows finance URLs when those actions are granted', () => {
		expect(canAccessPath('/finance/billing', elevatedGrants)).toBe(true);
		expect(canAccessPath('/finance/fees', elevatedGrants)).toBe(true);
		expect(canAccessPath('/finance/payment', elevatedGrants)).toBe(true);
		expect(canAccessPath('/finance/reconciliation', elevatedGrants)).toBe(true);
	});
});

describe('nav-permissions — comptable', () => {
	const accountantGrants = mockGrants(['FINANCIAL_CONFIG_READ', 'PAYMENT_READ']);

	it('allows finance URLs', () => {
		expect(canAccessPath('/finance/billing', accountantGrants)).toBe(true);
		expect(canAccessPath('/finance/fees', accountantGrants)).toBe(true);
		expect(canAccessPath('/finance/payment', accountantGrants)).toBe(true);
		expect(canAccessPath('/finance/reconciliation', accountantGrants)).toBe(false);
	});
});

describe('personal communications without administrative grants', () => {
	it('keeps inbox and own announcements reachable without inventing school grants', () => {
		expect(filterNavItems(SCHOOL_NAV_DEFS, []).map(item => item.key)).toEqual(['announcements']);
		expect(canAccessPath('/school/announcements', [])).toBe(true);
		expect(canAccessPath('/account/inbox', [])).toBe(true);
		expect(canAccessPath('/school/staff', [])).toBe(false);
		expect(canAccessPath('/finance/billing', [])).toBe(false);
	});
});
