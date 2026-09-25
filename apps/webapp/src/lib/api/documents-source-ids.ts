export function studentYearAccountSourceId(input: {
	schoolId: string;
	studentId: string;
	academicYearId: string;
	currency: string;
}): string {
	if (!input.currency.trim())
		throw new Error('School finance currency is required');
	return `sya:${input.schoolId}:${input.studentId}:${input.academicYearId}:${input.currency.trim()}`;
}

export function attendanceSheetSourceId(classGroupId: string, day: string): string {
	return `${classGroupId}:${day}`;
}
