import type { ActionGrantsSnapshot } from '$lib/auth/types';
import type { PlanningSurfacePermission } from '../../../src/routes/(app)/classes/[classId]/timetable/planning-surface';
import { checkPermission } from '$lib/permission-check';
import { describe, expect, it } from 'bun:test';
import {
	canAccessPlanningModal,
	planningSurfaceHref,
	resolvePlanningSurface,
} from '../../../src/routes/(app)/classes/[classId]/timetable/planning-surface';

function mockGrants(
	permissions: readonly PlanningSurfacePermission[],
	classIds: Partial<Record<PlanningSurfacePermission, string>> = {},
): ActionGrantsSnapshot {
	return permissions.map(permission => ({ permission, source: 'manual', scopes: classIds[permission] ? [{ kind: 'class_subject', classGroupId: classIds[permission]! }] : []	}));
}

function permissionCheck(grants: ActionGrantsSnapshot) {
	return (permission: PlanningSurfacePermission, classId: string) =>
		checkPermission(grants, permission, { classId });
}

describe('planning URL surface codec', () => {
	it('canonicalizes the new-session wizard to its stable start step', () => {
		const url = new URL('http://local/classes/6a/timetable?week=2026-08-10&modal=new-session');
		const surface = resolvePlanningSurface(url);

		expect(surface).toEqual({ modal: 'new-session', target: null, step: 'type' });
		expect(planningSurfaceHref(url, surface)).toBe(
			'/classes/6a/timetable?week=2026-08-10&modal=new-session&modalStep=type',
		);
	});

	it('keeps allow-listed wizard and attendance steps modal-specific', () => {
		expect(
			resolvePlanningSurface(
				new URL('http://local/classes/6a/timetable?modal=new-session&modalStep=schedule'),
			),
		).toEqual({ modal: 'new-session', target: null, step: 'schedule' });
		expect(
			resolvePlanningSurface(
				new URL('http://local/classes/6a/timetable?modal=attendance&modalTarget=s-1&modalStep=context'),
			),
		).toEqual({ modal: 'attendance', target: 's-1', step: 'mark' });
	});

	it('closes event workflows whose target is missing or inaccessible after loading', () => {
		const missing = new URL('http://local/classes/6a/timetable?modal=attendance');
		const inaccessible = new URL(
			'http://local/classes/6a/timetable?modal=reschedule&modalTarget=s-404',
		);

		expect(resolvePlanningSurface(missing)).toEqual({ modal: null, target: null, step: null });
		expect(resolvePlanningSurface(inaccessible, {
			eventIds: ['s-1'],
			validateEventTargets: true,
		})).toEqual({ modal: null, target: null, step: null });
	});

	it('preserves an accessible event target and canonical attendance start', () => {
		const url = new URL(
			'http://local/classes/6a/timetable?q=math&modal=attendance&modalTarget=s-1',
		);
		const surface = resolvePlanningSurface(url, {
			eventIds: ['s-1'],
			events: [{ id: 's-1', kind: 'lesson' }],
			validateEventTargets: true,
		});

		expect(surface).toEqual({ modal: 'attendance', target: 's-1', step: 'mark' });
		expect(planningSurfaceHref(url, surface)).toBe(
			'/classes/6a/timetable?q=math&modal=attendance&modalTarget=s-1&modalStep=mark',
		);
	});

	it('retains existing drawer modal names without stale workflow parameters', () => {
		const url = new URL(
			'http://local/classes/6a/timetable/s-1/details?modal=edit-event&modalTarget=old&modalStep=review',
		);
		const surface = resolvePlanningSurface(url);

		expect(surface).toEqual({ modal: 'edit-event', target: null, step: null });
		expect(planningSurfaceHref(url, surface)).toBe(
			'/classes/6a/timetable/s-1/details?modal=edit-event',
		);
	});

	it('matches encoded session identifiers before validating drawer actions', () => {
		const id = 'schedule:2026-10-05';
		const url = new URL(`http://local/classes/6a/timetable/${encodeURIComponent(id)}/logbook?modal=session-logbook`);
		const options = {
			events: [{ id, kind: 'lesson' }],
			validateEventTargets: true,
			validatePermissions: true,
			classId: '6a',
			hasPermission: permissionCheck(mockGrants(['CLASS_LOGBOOK_MANAGE'], { CLASS_LOGBOOK_MANAGE: '6a' })),
		};
		expect(resolvePlanningSurface(url, options).modal).toBe('session-logbook');
		expect(resolvePlanningSurface(url, { ...options, events: [] }).modal).toBeNull();
		expect(resolvePlanningSurface(url, { ...options, hasPermission: () => false }).modal).toBeNull();
	});

	it('closes an inaccessible drawer attendance student target', () => {
		const url = new URL(
			'http://local/classes/6a/timetable/s-1/attendance?modal=session-attendance&modalTarget=stu-404',
		);
		expect(resolvePlanningSurface(url, {
			studentIds: ['stu-1'],
			validateStudentTargets: true,
		})).toEqual({ modal: null, target: null, step: null });
	});

	it('enforces class-scoped timetable and attendance permissions', () => {
		const grants = mockGrants(
			['TIMETABLE_MANAGE', 'ATTENDANCE_RECORD'],
			{ TIMETABLE_MANAGE: '6a', ATTENDANCE_RECORD: '6a' },
		);
		const hasPermission = permissionCheck(grants);

		for (const modal of [
			'new-session',
			'create-schedule',
			'reschedule',
			'edit-event',
			'cancel',
		] as const) {
			expect(canAccessPlanningModal(modal, {
				classId: '6a',
				hasPermission,
				validatePermissions: true,
			})).toBe(true);
			expect(canAccessPlanningModal(modal, {
				classId: '7a',
				hasPermission,
				validatePermissions: true,
			})).toBe(false);
		}
		for (const modal of ['attendance', 'session-attendance'] as const) {
			expect(canAccessPlanningModal(modal, {
				classId: '6a',
				hasPermission,
				validatePermissions: true,
			})).toBe(true);
			expect(canAccessPlanningModal(modal, {
				classId: '7a',
				hasPermission,
				validatePermissions: true,
			})).toBe(false);
		}
		expect(resolvePlanningSurface(
			new URL('http://local/classes/7a/timetable?modal=create-schedule'),
			{
				classId: '7a',
				hasPermission,
				validatePermissions: true,
			},
		)).toEqual({ modal: null, target: null, step: null });
	});

	it('consolidated logbook management supports creation and editing', () => {
		const createOnly = permissionCheck(mockGrants(
			['CLASS_LOGBOOK_MANAGE'],
			{ CLASS_LOGBOOK_MANAGE: '6a' },
		));
		const updateOnly = permissionCheck(mockGrants(
			['CLASS_LOGBOOK_MANAGE'],
			{ CLASS_LOGBOOK_MANAGE: '6a' },
		));
		const event = { id: 's-1', kind: 'lesson' };

		expect(canAccessPlanningModal('session-logbook', {
			classId: '6a',
			event,
			hasPermission: createOnly,
			logbookExists: false,
			validatePermissions: true,
		})).toBe(true);
		expect(canAccessPlanningModal('session-logbook', {
			classId: '6a',
			event,
			hasPermission: createOnly,
			logbookExists: true,
			validatePermissions: true,
		})).toBe(true);
		expect(canAccessPlanningModal('session-logbook', {
			classId: '6a',
			event,
			hasPermission: updateOnly,
			logbookExists: true,
			validatePermissions: true,
		})).toBe(true);
		expect(canAccessPlanningModal('session-logbook', {
			classId: '6a',
			event: { ...event, kind: 'activity' },
			hasPermission: updateOnly,
			logbookExists: true,
			validatePermissions: true,
		})).toBe(false);
		expect(resolvePlanningSurface(
			new URL('http://local/classes/6a/timetable/s-1/logbook?modal=session-logbook'),
			{
				classId: '6a',
				events: [],
				hasPermission: createOnly,
				validateEventTargets: false,
				validatePermissions: true,
			},
		)).toEqual({ modal: 'session-logbook', target: null, step: null });
	});

	it('rejects unauthorized and ineligible cancel direct links', () => {
		const url = new URL(
			'http://local/classes/6a/timetable/s-1/details?modal=cancel',
		);
		const authorized = permissionCheck(mockGrants(
			['TIMETABLE_MANAGE'],
			{ TIMETABLE_MANAGE: '6a' },
		));
		const base = {
			classId: '6a',
			validateEventTargets: true,
			validatePermissions: true,
		};

		expect(resolvePlanningSurface(url, {
			...base,
			events: [{ id: 's-1', kind: 'lesson', status: 'cancelled' }],
			hasPermission: authorized,
		})).toEqual({ modal: null, target: null, step: null });
		expect(resolvePlanningSurface(url, {
			...base,
			events: [{ id: 's-1', kind: 'assessment' }],
			hasPermission: authorized,
		})).toEqual({ modal: null, target: null, step: null });
		expect(resolvePlanningSurface(url, {
			...base,
			events: [{ id: 's-1', kind: 'activity' }],
			hasPermission: permissionCheck(mockGrants([])),
		})).toEqual({ modal: null, target: null, step: null });
		expect(resolvePlanningSurface(url, {
			...base,
			events: [{ id: 's-1', kind: 'activity' }],
			hasPermission: authorized,
		})).toEqual({ modal: 'cancel', target: null, step: null });
	});
});
