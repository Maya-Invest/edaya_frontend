import {
	readModal,
	readModalStep,
	readModalTarget,
	writeModalSurface,
} from '$lib/modal/modal-url';

export const PLANNING_MODAL_KEYS = [
	'new-session',
	'create-schedule',
	'attendance',
	'reschedule',
	'edit-event',
	'cancel',
	'session-attendance',
	'session-logbook',
] as const;

export type PlanningModal = typeof PLANNING_MODAL_KEYS[number];
export type NewSessionStep = 'type' | 'context' | 'schedule';
export type AttendanceStep = 'mark' | 'review';
export type PlanningModalStep = NewSessionStep | AttendanceStep;
export type PlanningSurfacePermission
	= 'TIMETABLE_UPDATE'
		| 'ATTENDANCE_RECORD'
		| 'CLASS_LOGBOOK_CREATE'
		| 'CLASS_LOGBOOK_UPDATE';

export interface PlanningSurfaceEvent {
	id: string;
	kind: string;
	status?: string;
}

export interface PlanningSurface {
	modal: PlanningModal | null;
	target: string | null;
	step: PlanningModalStep | null;
}

export interface ResolvePlanningSurfaceOptions {
	eventIds?: readonly string[];
	validateEventTargets?: boolean;
	studentIds?: readonly string[];
	validateStudentTargets?: boolean;
	events?: readonly PlanningSurfaceEvent[];
	classId?: string;
	validatePermissions?: boolean;
	hasPermission?: (permission: PlanningSurfacePermission, classId: string) => boolean;
	logbookExists?: boolean;
}

const NEW_SESSION_STEPS = ['type', 'context', 'schedule'] as const;
const ATTENDANCE_STEPS = ['mark', 'review'] as const;

export function resolvePlanningSurface(
	url: URL,
	options: ResolvePlanningSurfaceOptions = {},
): PlanningSurface {
	const modal = readModal(url, PLANNING_MODAL_KEYS);
	if (!modal) {
		return { modal: null, target: null, step: null };
	}

	let surface: PlanningSurface;
	if (modal === 'new-session') {
		surface = {
			modal,
			target: null,
			step: readModalStep(url, NEW_SESSION_STEPS) ?? 'type',
		};
	}
	else if (modal === 'attendance') {
		const target = accessibleEventTarget(url, options);
		if (!target) {
			return { modal: null, target: null, step: null };
		}
		surface = {
			modal,
			target,
			step: readModalStep(url, ATTENDANCE_STEPS) ?? 'mark',
		};
	}
	else if (modal === 'reschedule') {
		const target = accessibleEventTarget(url, options);
		surface = target
			? { modal, target, step: null }
			: { modal: null, target: null, step: null };
	}
	else if (modal === 'session-attendance') {
		if (!hasSessionTabPath(url, 'attendance')) {
			return { modal: null, target: null, step: null };
		}
		const target = readModalTarget(url);
		const accessible = target
			&& (!options.validateStudentTargets || options.studentIds?.includes(target));
		surface = accessible
			? { modal, target, step: null }
			: { modal: null, target: null, step: null };
	}
	else {
		if (modal === 'session-logbook' && !hasSessionTabPath(url, 'logbook')) {
			return { modal: null, target: null, step: null };
		}
		if ((modal === 'edit-event' || modal === 'cancel') && !hasSessionDetailPath(url)) {
			return { modal: null, target: null, step: null };
		}
		surface = { modal, target: null, step: null };
	}

	if (!surface.modal) {
		return { modal: null, target: null, step: null };
	}
	const event = eventForSurface(url, surface, options.events);
	if (!isEligiblePlanningSurface(surface.modal, event, options.validateEventTargets === true)) {
		return { modal: null, target: null, step: null };
	}
	if (!canAccessPlanningModal(surface.modal, {
		classId: options.classId,
		event,
		hasPermission: options.hasPermission,
		logbookExists: options.logbookExists,
		validatePermissions: options.validatePermissions,
	})) {
		return { modal: null, target: null, step: null };
	}
	return surface;
}

export function canAccessPlanningModal(
	modal: PlanningModal,
	options: {
		classId?: string;
		event?: PlanningSurfaceEvent;
		hasPermission?: (permission: PlanningSurfacePermission, classId: string) => boolean;
		logbookExists?: boolean;
		validatePermissions?: boolean;
	},
): boolean {
	if (!options.validatePermissions) {
		return true;
	}
	if (!options.classId || !options.hasPermission) {
		return false;
	}
	if (
		modal === 'new-session'
		|| modal === 'create-schedule'
		|| modal === 'reschedule'
		|| modal === 'edit-event'
		|| modal === 'cancel'
	) {
		return options.hasPermission('TIMETABLE_UPDATE', options.classId);
	}
	if (modal === 'attendance' || modal === 'session-attendance') {
		return options.hasPermission('ATTENDANCE_RECORD', options.classId);
	}
	if (modal === 'session-logbook') {
		if (options.event && options.event.kind !== 'lesson') {
			return false;
		}
		if (options.logbookExists === true) {
			return options.hasPermission('CLASS_LOGBOOK_UPDATE', options.classId);
		}
		if (options.logbookExists === false) {
			return options.hasPermission('CLASS_LOGBOOK_CREATE', options.classId);
		}
		return options.hasPermission('CLASS_LOGBOOK_CREATE', options.classId)
			|| options.hasPermission('CLASS_LOGBOOK_UPDATE', options.classId);
	}
	return true;
}

export function planningSurfaceHref(url: URL, surface: PlanningSurface): string {
	return writeModalSurface(url, {
		modal: surface.modal,
		target: surface.target,
		step: surface.step,
	});
}

function eventForSurface(
	url: URL,
	surface: PlanningSurface,
	events: readonly PlanningSurfaceEvent[] | undefined,
): PlanningSurfaceEvent | undefined {
	const eventId = surface.target ?? sessionIdFromPath(url);
	return eventId ? events?.find(event => event.id === eventId) : undefined;
}

function isEligiblePlanningSurface(
	modal: PlanningModal,
	event: PlanningSurfaceEvent | undefined,
	validateEventTargets: boolean,
): boolean {
	if (!validateEventTargets || modal === 'new-session' || modal === 'create-schedule') {
		return true;
	}
	if (!event) {
		return false;
	}
	if (modal === 'edit-event') {
		return event.kind === 'lesson' && event.status !== 'cancelled';
	}
	if (modal === 'cancel' || modal === 'reschedule') {
		return (event.kind === 'lesson' || event.kind === 'activity')
			&& event.status !== 'cancelled';
	}
	if (modal === 'attendance') {
		return event.status !== 'cancelled';
	}
	if (modal === 'session-logbook') {
		return event.kind === 'lesson';
	}
	return true;
}

function accessibleEventTarget(
	url: URL,
	options: ResolvePlanningSurfaceOptions,
): string | null {
	const target = readModalTarget(url);
	if (!target) {
		return null;
	}
	if (!options.validateEventTargets) {
		return target;
	}
	return options.eventIds?.includes(target) ? target : null;
}

function hasSessionDetailPath(url: URL): boolean {
	return /\/timetable\/[^/]+(?:\/|$)/.test(url.pathname);
}

function sessionIdFromPath(url: URL): string | null {
	return /\/timetable\/([^/]+)/.exec(url.pathname)?.[1] ?? null;
}

function hasSessionTabPath(url: URL, tab: 'attendance' | 'logbook'): boolean {
	return new RegExp(`/timetable/[^/]+/${tab}/?$`).test(url.pathname);
}
