export function staffDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/staff\/([^/]+)/);
	return match?.[1];
}
