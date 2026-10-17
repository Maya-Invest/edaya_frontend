import { getContext, setContext } from 'svelte';

const key = Symbol('period-calendar-actions');
interface PeriodCalendarActions {
	readonly selectedId: string;
	readonly editable: boolean;
	readonly busy: boolean;
	edit: (id: string) => void;
	remove: (id: string) => void;
	resize: (id: string, end: Date) => void;
}
export function setPeriodCalendarActions(actions: PeriodCalendarActions) {
	setContext(key, actions);
}
export function getPeriodCalendarActions(): PeriodCalendarActions {
	return getContext(key);
}
