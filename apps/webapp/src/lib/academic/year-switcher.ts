import type { AcademicYear } from '$lib/types/school';

/** Workspace choices include every authorized year in this school, regardless of publication state. */
export function workspaceYearChoices(years: readonly AcademicYear[], schoolId: string | null): AcademicYear[] {
	return years.filter(year => Boolean(schoolId) && year.schoolId === schoolId)
		.toSorted((left, right) => right.startDate.localeCompare(left.startDate) || left.id.localeCompare(right.id));
}
