import type { ResolvedPathname } from '$app/types';
import type { AttendanceDay, ClassNode } from '$lib/types/school';

export interface HomeroomAttendanceNudgeRow {
	classId: string;
	className: string;
	href: ResolvedPathname;
}

export interface HomeroomAttendanceClassContext {
	days: AttendanceDay[];
	studentCount: number;
}

export function homeroomDailyClassesForStaff(
	classes: readonly Pick<ClassNode, 'id' | 'attendanceMode' | 'homeroomStaffId'>[],
	staffId: string,
): Pick<ClassNode, 'id' | 'attendanceMode' | 'homeroomStaffId'>[] {
	return classes.filter(
		cls => cls.attendanceMode === 'daily' && cls.homeroomStaffId === staffId,
	);
}

/** Staff webapp only: homeroom nudge follows homeroomStaffId, not portal teacher assignments. */
export function resolveHomeroomAttendanceNudges(args: {
	staffId: string;
	classes: readonly Pick<ClassNode, 'id' | 'name' | 'attendanceMode' | 'homeroomStaffId' | 'studentCount'>[];
	attendanceByClass: ReadonlyMap<string, HomeroomAttendanceClassContext>;
	todayIso: string;
	classAttendanceHref: (classId: string, dayId?: string) => ResolvedPathname;
}): HomeroomAttendanceNudgeRow[] {
	return args.classes.flatMap((cls) => {
		if (cls.attendanceMode !== 'daily' || cls.homeroomStaffId !== args.staffId) {
			return [];
		}

		const context = args.attendanceByClass.get(cls.id);
		const days = context?.days ?? [];
		const studentCount = context?.studentCount || cls.studentCount || 0;
		const todayOccurrence = days.find(day => day.classId === cls.id && day.date === args.todayIso);

		if (
			todayOccurrence
			&& todayOccurrence.totalStudents > 0
			&& todayOccurrence.recordedCount >= todayOccurrence.totalStudents
		) {
			return [];
		}

		if (
			todayOccurrence
			&& todayOccurrence.totalStudents > 0
			&& todayOccurrence.recordedCount < todayOccurrence.totalStudents
		) {
			return [{
				classId: cls.id,
				className: cls.name,
				href: args.classAttendanceHref(cls.id, todayOccurrence.id || undefined),
			}];
		}

		if (studentCount > 0) {
			return [{
				classId: cls.id,
				className: cls.name,
				href: args.classAttendanceHref(cls.id),
			}];
		}

		// Enrollment count may be unavailable (403) — still nudge until roll call is provably complete.
		return [{
			classId: cls.id,
			className: cls.name,
			href: args.classAttendanceHref(cls.id),
		}];
	});
}
