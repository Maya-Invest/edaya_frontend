export function teacherDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/teachers\/([^/]+)/);
	return match?.[1];
}
