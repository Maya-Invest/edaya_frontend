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
	return decodeSegment(match?.[2]);
}

export function attendanceClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/attendance/);
	return decodeSegment(match?.[1]);
}

function decodeSegment(value: string | undefined): string | undefined {
	if (!value)
		return undefined;
	try {
		return decodeURIComponent(value);
	}
	catch {
		return undefined;
	}
}
