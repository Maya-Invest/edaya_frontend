export interface AcademicPageSlice {
	yearCount: number;
}

export function emptyAcademicSlice(): AcademicPageSlice {
	return {
		yearCount: 0,
	};
}
