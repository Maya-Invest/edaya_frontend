export function studentDetailIdFromUrl(url: URL): string | undefined {
	return url.pathname.match(/\/(?:school\/students|classes\/[^/]+\/students)\/([^/]+)$/)?.[1];
}
