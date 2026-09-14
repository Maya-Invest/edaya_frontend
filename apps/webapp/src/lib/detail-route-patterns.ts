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
	/^\/configuration\/notifications\/[^/]+$/,
] as const;

/** School students drawer tabs use nested paths (`/:id/:tab`) beyond the single-segment detail pattern. */
const SCHOOL_STUDENTS_DRAWER_PATH = /^\/school\/students\/[^/]+(?:\/[^/]+)?$/;
const SCHOOL_STAFF_DRAWER_PATH = /^\/school\/staff\/[^/]+(?:\/[^/]+)?$/;
const SCHOOL_TEACHERS_DRAWER_PATH = /^\/school\/teachers\/[^/]+(?:\/[^/]+)?$/;
const SCHOOL_ACTIVITIES_DRAWER_PATH = /^\/school\/activities\/[^/]+(?:\/[^/]+)?$/;
const CLASS_TIMETABLE_DRAWER_PATH = /^\/classes\/[^/]+\/timetable\/[^/]+(?:\/[^/]+)?$/;
const CLASS_EVALUATIONS_DRAWER_PATH = /^\/classes\/[^/]+\/evaluations\/[^/]+(?:\/[^/]+)?$/;
const CLASS_TEACHING_DRAWER_PATH = /^\/classes\/[^/]+\/teaching\/[^/]+(?:\/[^/]+)?$/;
const CLASS_REPORT_CARDS_DRAWER_PATH = /^\/classes\/[^/]+\/report-cards\/[^/]+(?:\/[^/]+)?$/;
const CLASS_ATTENDANCE_DRAWER_PATH = /^\/classes\/[^/]+\/attendance\/[^/]+(?:\/[^/]+)?$/;
const FINANCE_BILLING_DRAWER_PATH = /^\/finance\/billing\/[^/]+(?:\/[^/]+)?$/;
const CONFIG_REPORT_CARDS_DRAWER_PATH = /^\/configuration\/report-cards\/[^/]+(?:\/[^/]+)?$/;
const CONFIG_GRADE_LEVELS_DRAWER_PATH = /^\/configuration\/grade-levels\/[^/]+(?:\/[^/]+)?$/;
const CONFIG_CLASSES_DRAWER_PATH = /^\/configuration\/classes\/[^/]+(?:\/[^/]+)?$/;
const CONFIG_SUBJECTS_DRAWER_PATH = /^\/configuration\/subjects\/[^/]+(?:\/[^/]+)?$/;
const CONFIG_NOTIFICATIONS_DRAWER_PATH = /^\/configuration\/notifications\/[^/]+$/;

export function isLikelyDetailPath(pathname: string): boolean {
	return DETAIL_PATH_PATTERNS.some(pattern => pattern.test(pathname))
		|| SCHOOL_STUDENTS_DRAWER_PATH.test(pathname)
		|| SCHOOL_STAFF_DRAWER_PATH.test(pathname)
		|| SCHOOL_TEACHERS_DRAWER_PATH.test(pathname)
		|| SCHOOL_ACTIVITIES_DRAWER_PATH.test(pathname)
		|| CLASS_TIMETABLE_DRAWER_PATH.test(pathname)
		|| CLASS_EVALUATIONS_DRAWER_PATH.test(pathname)
		|| CLASS_TEACHING_DRAWER_PATH.test(pathname)
		|| CLASS_REPORT_CARDS_DRAWER_PATH.test(pathname)
		|| CLASS_ATTENDANCE_DRAWER_PATH.test(pathname)
		|| FINANCE_BILLING_DRAWER_PATH.test(pathname)
		|| CONFIG_REPORT_CARDS_DRAWER_PATH.test(pathname)
		|| CONFIG_GRADE_LEVELS_DRAWER_PATH.test(pathname)
		|| CONFIG_CLASSES_DRAWER_PATH.test(pathname)
		|| CONFIG_SUBJECTS_DRAWER_PATH.test(pathname)
		|| CONFIG_NOTIFICATIONS_DRAWER_PATH.test(pathname);
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
	const teachingMatch = pathname.match(/^\/classes\/([^/]+)\/teaching\/[^/]+/);
	if (teachingMatch) {
		return `/classes/${teachingMatch[1]}/teaching`;
	}
	const reportCardsMatch = pathname.match(/^\/classes\/([^/]+)\/report-cards\/[^/]+/);
	if (reportCardsMatch) {
		return `/classes/${reportCardsMatch[1]}/report-cards`;
	}
	const attendanceMatch = pathname.match(/^\/classes\/([^/]+)\/attendance\/[^/]+/);
	if (attendanceMatch) {
		return `/classes/${attendanceMatch[1]}/attendance`;
	}
	const billingMatch = pathname.match(/^\/finance\/billing\/[^/]+/);
	if (billingMatch) {
		return '/finance/billing';
	}
	const configReportCardsMatch = pathname.match(/^\/configuration\/report-cards\/[^/]+/);
	if (configReportCardsMatch) {
		return '/configuration/report-cards';
	}
	const configGradeLevelsMatch = pathname.match(/^\/configuration\/grade-levels\/[^/]+/);
	if (configGradeLevelsMatch) {
		return '/configuration/grade-levels';
	}
	const configClassesMatch = pathname.match(/^\/configuration\/classes\/[^/]+/);
	if (configClassesMatch) {
		return '/configuration/classes';
	}
	const configSubjectsMatch = pathname.match(/^\/configuration\/subjects\/[^/]+(?:\/[^/]+)?/);
	if (configSubjectsMatch) {
		return '/configuration/subjects';
	}
	if (CONFIG_NOTIFICATIONS_DRAWER_PATH.test(pathname)) {
		return '/configuration/notifications';
	}
	if (isLikelyDetailPath(pathname)) {
		return pathname.replace(/\/[^/]+$/, '');
	}
	return pathname;
}

/** List URL to navigate to after closing or deleting a URL-backed detail entity. */
export function listPathForDetailNavigation(pathname: string): string {
	return normalizeListPathname(pathname);
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
