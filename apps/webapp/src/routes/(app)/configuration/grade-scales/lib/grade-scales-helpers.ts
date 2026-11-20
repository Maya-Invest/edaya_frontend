import type { GradeScale } from '$lib/types/report-cards';

export interface GradeScalesPageSlice {
	scales: GradeScale[];
}

export function emptyGradeScalesSlice(): GradeScalesPageSlice {
	return {
		scales: [],
	};
}
