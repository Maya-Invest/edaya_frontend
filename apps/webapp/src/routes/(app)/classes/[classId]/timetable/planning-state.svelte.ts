import type { PlanningEvent } from '$lib/types/school';
import type {
	NewSessionStep,
	PlanningModal,
	PlanningModalStep,
	PlanningSurface,
	PlanningSurfaceEvent,
} from './planning-surface';
import { academicContext } from '$lib/academic/context.svelte';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readPlanningListFilters, writePlanningListFilters } from '$lib/list/list-url-filters';
import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
import { appGoto, appPath } from '$lib/navigation/app-navigation';
import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
import { currentRouteSurfaceHref, openRouteSurface, replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
import { hasPermission } from '$lib/permissions';
import {
	formatWeekAnchor,
	isCurrentWeek,
	mondayOfWeek,
	parseWeekAnchor,
	shiftWeek,
	todayDate,
} from '$lib/scheduling/planning-calendar';
import { getContext, setContext, untrack } from 'svelte';
import { sessionAttendanceTaskHref } from './lib/attendance-task';
import {
	PLANNING_MODAL_KEYS,
	canAccessPlanningModal,
	planningSurfaceHref,
	resolvePlanningSurface,
} from './planning-surface';

const PLANNING_STATE_KEY = Symbol('planning-state');

export class PlanningState {
	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	readonly filters: ListFiltersState<{ q: string; week: string }>;
	readonly modals;

	weekPickerValue = $state('');

	constructor(
		private readonly getUrl: () => URL,
		private readonly getClassId: () => string,
	) {
		this.filters = new ListFiltersState(
			{
				getUrl: () => this.getUrl(),
				write: writePlanningListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readPlanningListFilters(this.getUrl()),
		);
		this.modals = createUrlSyncedModals<PlanningModal>({
			allowed: PLANNING_MODAL_KEYS,
			allowedSteps: ['type', 'context', 'schedule', 'mark', 'review'],
			getUrl: this.getUrl,
		});
	}

	get weekStart(): Date {
		return parseWeekAnchor(this.filters.values.week);
	}

	viewingCurrentWeek(): boolean {
		return isCurrentWeek(this.weekStart);
	}

	filterEvents(events: readonly PlanningEvent[]): PlanningEvent[] {
		const needle = this.filters.values.q.trim().toLowerCase();
		if (!needle) {
			return [...events];
		}
		return events.filter(ev =>
			ev.title.toLowerCase().includes(needle)
			|| ev.subject.toLowerCase().includes(needle)
			|| ev.teacher.toLowerCase().includes(needle)
			|| ev.room.toLowerCase().includes(needle),
		);
	}

	hydrateFromUrl(
		url: URL,
		options: {
			eventIds?: readonly string[];
			validateEventTargets?: boolean;
			studentIds?: readonly string[];
			validateStudentTargets?: boolean;
			events?: readonly PlanningSurfaceEvent[];
		} = {},
	) {
		const next = readPlanningListFilters(url);
		this.filters.hydrate(next);
		this.weekPickerValue = formatWeekAnchor(parseWeekAnchor(next.week));

		const classId = this.getClassId();
		const surface = resolvePlanningSurface(url, {
			...options,
			classId,
			validatePermissions: academicContext.shellReady,
			hasPermission: (permission, scopedClassId) =>
				hasPermission(permission, { classId: scopedClassId }),
		});
		if (surface.modal === 'attendance' && surface.target && options.validateEventTargets && academicContext.shellReady) {
			const daily = academicContext.classes.find(row => row.id === classId)?.attendanceMode === 'daily';
			replaceRouteSurface(daily ? `${appPath('/(app)/classes/[classId]/attendance', { classId })}${detailNavigationSearch(url)}` : sessionAttendanceTaskHref(url, classId, surface.target));
			return;
		}
		// Local open/close state must not retrigger URL hydration before navigation settles.
		const openingWorkflow = untrack(() => this.modals.active !== surface.modal);
		if (openingWorkflow && surface.modal === 'new-session' && surface.step !== 'type') {
			surface.step = 'type';
		}
		if (openingWorkflow && surface.modal === 'attendance' && surface.step !== 'mark') {
			surface.step = 'mark';
		}
		const canonicalHref = planningSurfaceHref(url, surface);
		const currentHref = `${url.pathname}${url.search}`;
		if (canonicalHref !== currentHref) {
			this.applySurface(surface);
			replaceRouteSurface(canonicalHref);
			return;
		}
		this.modals.hydrate();
	}

	navigateWeek(nextWeekStart: Date) {
		const href = writePlanningListFilters(this.getUrl(), {
			q: this.filters.values.q,
			week: isCurrentWeek(nextWeekStart) ? '' : formatWeekAnchor(nextWeekStart),
		});
		appGoto(href, { keepFocus: true, noScroll: true });
	}

	goToPreviousWeek() {
		this.navigateWeek(shiftWeek(this.weekStart, -1));
	}

	goToNextWeek() {
		this.navigateWeek(shiftWeek(this.weekStart, 1));
	}

	goToThisWeek() {
		this.navigateWeek(mondayOfWeek(todayDate()));
	}

	openNewSession() {
		this.modals.open('new-session', { step: 'type' });
	}

	openAttendance = (event: PlanningEvent) => {
		if (event.classId !== this.getClassId() || academicContext.classes.find(row => row.id === event.classId)?.attendanceMode !== 'session' || !hasPermission('ATTENDANCE_RECORD', { classId: event.classId }))
return;
		openRouteSurface(sessionAttendanceTaskHref(this.getUrl(), event.classId, event.id), currentRouteSurfaceHref(this.getUrl()));
	};

	openScheduleCreate() {
		this.modals.open('create-schedule');
	}

	openReschedule(eventId: string) {
		this.modals.open('reschedule', { target: eventId });
	}

	get newSessionStep(): NewSessionStep {
		const step = this.modals.step;
		return step === 'context' || step === 'schedule' ? step : 'type';
	}

	canOpenSessionLogbook(event: PlanningSurfaceEvent, logbookExists: boolean): boolean {
		return canAccessPlanningModal('session-logbook', {
			classId: this.getClassId(),
			event,
			logbookExists,
			validatePermissions: true,
			hasPermission: (permission, scopedClassId) =>
				hasPermission(permission, { classId: scopedClassId }),
		});
	}

	validateSessionLogbookSurface(event: PlanningSurfaceEvent, logbookExists: boolean) {
		if (
			this.modals.isOpen('session-logbook')
			&& !this.canOpenSessionLogbook(event, logbookExists)
		) {
			this.closeInvalidSurface();
		}
	}

	setStep(step: PlanningModalStep) {
		this.modals.setStep(step);
	}

	replaceStep(step: PlanningModalStep) {
		if (!this.modals.active) {
			return;
		}
		this.replaceSurface({
			modal: this.modals.active,
			target: this.modals.target,
			step,
		});
	}

	closeInvalidSurface() {
		this.replaceSurface({ modal: null, target: null, step: null });
	}

	private replaceSurface(surface: PlanningSurface) {
		this.applySurface(surface);
		replaceRouteSurface(planningSurfaceHref(this.getUrl(), surface));
	}

	private applySurface(surface: PlanningSurface) {
		this.modals.active = surface.modal;
		this.modals.target = surface.target;
		this.modals.step = surface.step;
		this.modals.tab = null;
		this.modals.ready = true;
	}
}

export function setPlanningState(state: PlanningState) {
	setContext(PLANNING_STATE_KEY, state);
}

export function getPlanningState(): PlanningState {
	return getContext<PlanningState>(PLANNING_STATE_KEY);
}
