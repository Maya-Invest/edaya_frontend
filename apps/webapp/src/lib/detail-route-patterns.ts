const DETAIL_PATH_PATTERNS = [
	/^\/account\/inbox\/[^/]+$/,
	/^\/school\/(students|guardians|staff|teachers|activities|announcements|events|calendar)\/[^/]+$/,
	/^\/classes\/[^/]+\/(students|subjects|timetable|teaching|evaluations|report-cards)\/[^/]+$/,
	/^\/finance\/(billing|fees)\/[^/]+$/,
	/^\/configuration\/subjects\/level\/[^/]+$/,
	/^\/configuration\/subjects\/[^/]+$/,
	/^\/configuration\/grade-levels\/[^/]+$/,
	/^\/configuration\/classes\/[^/]+$/,
	/^\/configuration\/report-cards\/[^/]+$/,
] as const;

export function isLikelyDetailPath(pathname: string): boolean {
	return DETAIL_PATH_PATTERNS.some(pattern => pattern.test(pathname));
}

/** Stable key for list page data — ignores optional detail segments in the URL. */
export function listRouteCacheKey(url: URL): string {
	const pathname = url.pathname.replace(/\/$/, '') || '/';
	const listPathname = isLikelyDetailPath(pathname)
		? pathname.replace(/\/[^/]+$/, '')
		: pathname;
	const demo = url.searchParams.get('demo');
	return demo ? `${listPathname}?demo=${demo}` : listPathname;
}
