export interface ClassesPageSlice {
	classCount: number;
}

export function emptyClassesSlice(): ClassesPageSlice {
	return {
		classCount: 0,
	};
}

export function classGroupIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/^\/configuration\/structure\/classes\/([^/]+)(?:\/|$)/);
	return match?.[1];
}
