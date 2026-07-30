import type {
	Activity,
	PlanningEvent,
	SchoolYearEvent,
	Student,
	Subject,
	TimetableSchedule,
} from '$lib/types/school';

export interface TimetablePageSlice {
	classId: string;
	events: PlanningEvent[];
	schedules: TimetableSchedule[];
	students: Student[];
	subjects: Subject[];
	activities: Activity[];
	schoolYearEvents: SchoolYearEvent[];
}

export function emptyTimetableSlice(classId: string): TimetablePageSlice {
	return {
		classId,
		events: [],
		schedules: [],
		students: [],
		subjects: [],
		activities: [],
		schoolYearEvents: [],
	};
}

export function timetableClassIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/classes\/([^/]+)\/timetable/)?.[1];
}

export function sessionDetailIdFromUrl(url: URL): string | undefined {
	const raw = url.pathname.match(/\/classes\/[^/]+\/timetable\/([^/]+)/)?.[1];
	if (!raw) {
		return undefined;
	}
	try {
		return decodeURIComponent(raw);
	}
	catch {
		return raw;
	}
}
