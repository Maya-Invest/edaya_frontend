export interface GradeLevelsPageSlice {
	levelCount: number;
}

export function emptyGradeLevelsSlice(): GradeLevelsPageSlice {
	return {
		levelCount: 0,
	};
}

export function gradeLevelIdFromUrl(url: URL): string | undefined {
	return url.searchParams.get('gradeLevel') ?? undefined;
}
