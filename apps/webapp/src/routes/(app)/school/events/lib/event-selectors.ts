export function incidentDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/events\/([^/]+)/);
	return match?.[1];
}
