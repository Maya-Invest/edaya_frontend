export function activityDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/activities\/([^/]+)/);
	return match?.[1];
}

export function studentDisplayFallback(studentId: string): string {
	return `Student ${studentId.slice(-6)}`;
}
