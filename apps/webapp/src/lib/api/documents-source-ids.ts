import { DEFAULT_CATALOG_CURRENCY } from '$lib/api/finance-types';

export function studentYearAccountSourceId(input: {
	schoolId: string;
	studentId: string;
	academicYearId: string;
	currency?: string;
}): string {
	return `sya:${input.schoolId}:${input.studentId}:${input.academicYearId}:${input.currency?.trim() || DEFAULT_CATALOG_CURRENCY}`;
}

export function attendanceSheetSourceId(classGroupId: string, day: string): string {
	return `${classGroupId}:${day}`;
}
