export const PLANNING_TIMETABLE_CONTEXT = 'planning-timetable-context';

export interface PlanningTimetableContext {
	onAttendance?: (eventId: string) => void;
}
