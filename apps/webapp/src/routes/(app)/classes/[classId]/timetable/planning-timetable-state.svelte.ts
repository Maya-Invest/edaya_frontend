import type { PlanningSlotFromDates } from '$lib/scheduling/planning-calendar';
import type { PlanningEvent } from '$lib/types/school';
import { getContext, setContext } from 'svelte';

export const PLANNING_TIMETABLE_CONTEXT_KEY = Symbol('planning-timetable');

export interface PlanningTimetableContext {
	onAttendance?: (eventId: string) => void;
}

export class PlanningTimetableState {
	confirmOpen = $state(false);
	confirmBusy = $state(false);
	pendingReschedule = $state<{
		event: PlanningEvent;
		slot: PlanningSlotFromDates;
	} | null>(null);

	private onAttendance?: (eventId: string) => void;

	configure(options: { onAttendance?: (eventId: string) => void }) {
		this.onAttendance = options.onAttendance;
	}

	get context(): PlanningTimetableContext {
		return {
			onAttendance: eventId => this.onAttendance?.(eventId),
		};
	}

	queueReschedule(event: PlanningEvent, slot: PlanningSlotFromDates) {
		this.pendingReschedule = { event, slot };
		this.confirmOpen = true;
	}

	closeConfirm() {
		if (this.confirmBusy) {
			return;
		}
		this.confirmOpen = false;
		this.pendingReschedule = null;
	}

	async confirmReschedule(
		mutate: (input: {
			sessionId: string;
			kind: PlanningEvent['kind'];
			scheduleId?: string;
			day: PlanningSlotFromDates['day'];
			dayOfWeek: PlanningSlotFromDates['dayOfWeek'];
			startTime: string;
			endTime: string;
		}) => Promise<boolean>,
	) {
		if (!this.pendingReschedule) {
			return;
		}

		this.confirmBusy = true;
		const { event, slot } = this.pendingReschedule;
		const ok = await mutate({
			sessionId: event.id,
			kind: event.kind,
			scheduleId: event.scheduleId,
			day: slot.day,
			dayOfWeek: slot.dayOfWeek,
			startTime: slot.startTime,
			endTime: slot.endTime,
		});
		this.confirmBusy = false;
		if (!ok) {
			return;
		}

		this.confirmOpen = false;
		this.pendingReschedule = null;
	}
}

export function setPlanningTimetableState(state: PlanningTimetableState) {
	setContext(PLANNING_TIMETABLE_CONTEXT_KEY, state);
}

export function getPlanningTimetableState(): PlanningTimetableState {
	return getContext<PlanningTimetableState>(PLANNING_TIMETABLE_CONTEXT_KEY);
}

export function getPlanningTimetableContext(): PlanningTimetableContext {
	return getPlanningTimetableState().context;
}
