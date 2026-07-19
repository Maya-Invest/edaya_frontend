export function announcementDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/school\/announcements\/([^/]+)/);
	return match?.[1];
}
