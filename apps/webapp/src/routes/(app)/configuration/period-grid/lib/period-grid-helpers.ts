export interface PeriodGridPageSlice {
	yearCount: number;
}

export function emptyPeriodGridSlice(): PeriodGridPageSlice {
	return {
		yearCount: 0,
	};
}
