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

/** School students drawer tabs use nested paths (`/:id/:tab`) beyond the single-segment detail pattern. */
const SCHOOL_STUDENTS_DRAWER_PATH = /^\/school\/students\/[^/]+(?:\/[^/]+)?$/;
const SCHOOL_STAFF_DRAWER_PATH = /^\/school\/staff\/[^/]+(?:\/[^/]+)?$/;
const SCHOOL_TEACHERS_DRAWER_PATH = /^\/school\/teachers\/[^/]+(?:\/[^/]+)?$/;
const SCHOOL_ACTIVITIES_DRAWER_PATH = /^\/school\/activities\/[^/]+(?:\/[^/]+)?$/;
const CLASS_TIMETABLE_DRAWER_PATH = /^\/classes\/[^/]+\/timetable\/[^/]+(?:\/[^/]+)?$/;
const CLASS_EVALUATIONS_DRAWER_PATH = /^\/classes\/[^/]+\/evaluations\/[^/]+(?:\/[^/]+)?$/;

export function isLikelyDetailPath(pathname: string): boolean {
	return DETAIL_PATH_PATTERNS.some(pattern => pattern.test(pathname))
		|| SCHOOL_STUDENTS_DRAWER_PATH.test(pathname)
		|| SCHOOL_STAFF_DRAWER_PATH.test(pathname)
		|| SCHOOL_TEACHERS_DRAWER_PATH.test(pathname)
		|| SCHOOL_ACTIVITIES_DRAWER_PATH.test(pathname)
		|| CLASS_TIMETABLE_DRAWER_PATH.test(pathname)
		|| CLASS_EVALUATIONS_DRAWER_PATH.test(pathname);
}

function normalizeListPathname(pathname: string): string {
	if (SCHOOL_STUDENTS_DRAWER_PATH.test(pathname)) {
		return '/school/students';
	}
	if (SCHOOL_STAFF_DRAWER_PATH.test(pathname)) {
		return '/school/staff';
	}
	if (SCHOOL_TEACHERS_DRAWER_PATH.test(pathname)) {
		return '/school/teachers';
	}
	if (SCHOOL_ACTIVITIES_DRAWER_PATH.test(pathname)) {
		return '/school/activities';
	}
	const timetableMatch = pathname.match(/^\/classes\/([^/]+)\/timetable\/[^/]+/);
	if (timetableMatch) {
		return `/classes/${timetableMatch[1]}/timetable`;
	}
	const evaluationsMatch = pathname.match(/^\/classes\/([^/]+)\/evaluations\/[^/]+/);
	if (evaluationsMatch) {
		return `/classes/${evaluationsMatch[1]}/evaluations`;
	}
	if (isLikelyDetailPath(pathname)) {
		return pathname.replace(/\/[^/]+$/, '');
	}
	return pathname;
}

function cacheKeyWithDemo(pathname: string, url: URL): string {
	const demo = url.searchParams.get('demo');
	return demo ? `${pathname}?demo=${demo}` : pathname;
}

/** Stable key for list page data — ignores optional detail segments in the URL. */
export function listRouteCacheKey(url: URL): string {
	const pathname = url.pathname.replace(/\/$/, '') || '/';
	return cacheKeyWithDemo(normalizeListPathname(pathname), url);
}

/** Stable key for drawer tab PageQuery instances — pathname only, separate from the list cache. */
export function drawerTabRouteCacheKey(url: URL): string {
	const pathname = url.pathname.replace(/\/$/, '') || '/';
	return cacheKeyWithDemo(pathname, url);
}
