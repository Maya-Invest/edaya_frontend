import type { AttendanceDay } from '$lib/types/school';

export interface AttendancePageSlice {
	classId: string;
	attendanceDays: AttendanceDay[];
}

export function emptyAttendanceSlice(classId: string): AttendancePageSlice {
	return {
		classId,
		attendanceDays: [],
	};
}

export function attendanceDayDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/attendance\/([^/]+)/);
	return match?.[2];
}

export function attendanceClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/attendance/);
	return match?.[1];
}
