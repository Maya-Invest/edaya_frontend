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

function resolveTodayAttendanceDay(
	days: readonly AttendanceDay[],
	classId: string,
	todayIso: string,
	studentCount: number,
): AttendanceDay | null {
	const todayDay = days.find(day => day.classId === classId && day.date === todayIso);
	if (todayDay) {
		return todayDay;
	}
	if (studentCount === 0) {
		return null;
	}
	return {
		id: '',
		classId,
		date: todayIso,
		label: 'Daily attendance',
		totalStudents: studentCount,
		recordedCount: 0,
	};
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
		const todayDay = resolveTodayAttendanceDay(
			context?.days ?? [],
			cls.id,
			args.todayIso,
			context?.studentCount || cls.studentCount || 0,
		);
		if (!todayDay || todayDay.totalStudents === 0 || todayDay.recordedCount >= todayDay.totalStudents) {
			return [];
		}

		return [{
			classId: cls.id,
			className: cls.name,
			href: args.classAttendanceHref(cls.id, todayDay.id || undefined),
		}];
	});
}
