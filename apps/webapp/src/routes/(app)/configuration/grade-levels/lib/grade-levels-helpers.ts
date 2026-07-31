export interface GradeLevelsPageSlice {
	levelCount: number;
}

export function emptyGradeLevelsSlice(): GradeLevelsPageSlice {
	return {
		levelCount: 0,
	};
}

export function gradeLevelIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/^\/configuration\/grade-levels\/([^/]+)$/);
	return match?.[1];
}
