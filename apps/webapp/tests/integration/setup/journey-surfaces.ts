/**
 * Static claims: which journey step owns which nav path / drawer tab / modal.
 * Used by the coverage unit test — not by Playwright.
 */
export interface JourneyModalClaim {
	parentRoute: string;
	modal: string;
}

export interface JourneyTabClaim {
	routePattern: string;
	tab: string;
}

export interface JourneySurfaceClaim {
	stepId: string;
	paths?: readonly string[];
	classSegments?: readonly string[];
	modals?: readonly JourneyModalClaim[];
	tabs?: readonly JourneyTabClaim[];
	naReason?: string;
}

const STUDENT_TABS = ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments'] as const;

export const JOURNEY_SURFACE_CLAIMS: readonly JourneySurfaceClaim[] = [
	{
		stepId: 'shell.dashboard',
		paths: ['/dashboard'],
		modals: [{ parentRoute: '/dashboard', modal: 'account-profile' }],
	},
	{
		stepId: 'shell.account',
		paths: ['/account/inbox', '/account/notifications'],
	},
	{
		stepId: 'structure.academic',
		paths: ['/configuration/academic'],
	},
	{
		stepId: 'structure.grade-level',
		paths: ['/configuration/grade-levels', '/configuration/grade-levels/[id]'],
		modals: [
			{ parentRoute: '/configuration/grade-levels', modal: 'create' },
			{ parentRoute: '/configuration/grade-levels/[id]', modal: 'edit' },
		],
	},
	{
		stepId: 'structure.class',
		paths: ['/configuration/classes', '/configuration/classes/[id]/profile'],
		modals: [
			{ parentRoute: '/configuration/classes', modal: 'create' },
			{ parentRoute: '/configuration/classes/[id]/profile', modal: 'edit' },
		],
		tabs: [{ routePattern: '/configuration/classes/[id]', tab: 'profile' }],
	},
	{
		stepId: 'configuration.school',
		paths: ['/configuration/school'],
		modals: [{ parentRoute: '/configuration/school', modal: 'edit' }],
	},
	{
		stepId: 'configuration.subjects',
		paths: [
			'/configuration/subjects',
			'/configuration/subjects/[id]/progression',
			'/configuration/subjects/[id]/logbook',
		],
		modals: [
			{ parentRoute: '/configuration/subjects', modal: 'create-subject' },
			{ parentRoute: '/configuration/subjects/[id]/progression', modal: 'add-chapter' },
		],
		tabs: [
			{ routePattern: '/configuration/subjects/[id]', tab: 'progression' },
			{ routePattern: '/configuration/subjects/[id]', tab: 'logbook' },
		],
	},
	{
		stepId: 'configuration.scales-report-cards',
		paths: [
			'/configuration/grade-scales',
			'/configuration/report-cards',
			'/configuration/report-cards/[id]',
		],
		modals: [
			{ parentRoute: '/configuration/grade-scales', modal: 'create' },
			{ parentRoute: '/configuration/report-cards', modal: 'create' },
			{ parentRoute: '/configuration/report-cards/[id]', modal: 'delete' },
		],
	},
	{
		stepId: 'configuration.notifications-discipline-tools',
		paths: [
			'/configuration/notifications',
			'/configuration/notifications/[id]',
			'/configuration/discipline',
			'/configuration/tools',
			'/configuration/tools/teacher-assignments',
		],
		modals: [
			{ parentRoute: '/configuration/notifications', modal: 'reset-all' },
			{ parentRoute: '/configuration/notifications/[id]', modal: 'edit' },
			{ parentRoute: '/configuration/notifications/[id]', modal: 'reset-key' },
			{ parentRoute: '/configuration/discipline', modal: 'create' },
			{ parentRoute: '/configuration/tools/teacher-assignments', modal: 'create' },
		],
	},
	{
		stepId: 'people.student',
		paths: [
			'/school/students',
			...STUDENT_TABS.map(tab => `/school/students/[id]/${tab}`),
		],
		modals: [
			{ parentRoute: '/school/students', modal: 'create' },
			{ parentRoute: '/school/students/[id]/profile', modal: 'edit-profile' },
			{ parentRoute: '/school/students/[id]/profile', modal: 'link-guardian' },
			{ parentRoute: '/school/students/[id]/profile', modal: 'note' },
			{ parentRoute: '/school/students/[id]/attendance', modal: 'add-absence' },
			{ parentRoute: '/school/students/[id]/incidents', modal: 'add-incident' },
			{ parentRoute: '/school/students/[id]/grades', modal: 'add-grade' },
		],
		tabs: STUDENT_TABS.map(tab => ({ routePattern: '/school/students/[id]', tab })),
	},
	{
		stepId: 'people.guardian-staff-teacher',
		paths: [
			'/school/guardians',
			'/school/guardians/[id]',
			'/school/staff',
			'/school/staff/[id]/profile',
			'/school/staff/[id]/permissions',
			'/school/staff/[id]/assignments',
			'/school/teachers',
			'/school/teachers/[id]/profile',
			'/school/teachers/[id]/assignments',
			'/school/teachers/[id]/availability',
		],
		modals: [
			{ parentRoute: '/school/guardians', modal: 'create' },
			{ parentRoute: '/school/guardians/[id]', modal: 'edit-profile' },
			{ parentRoute: '/school/staff', modal: 'create' },
			{ parentRoute: '/school/staff/[id]/profile', modal: 'edit-profile' },
			{ parentRoute: '/school/staff/[id]/permissions', modal: 'add-permission' },
			{ parentRoute: '/school/teachers', modal: 'create' },
			{ parentRoute: '/school/teachers/[id]/assignments', modal: 'form' },
		],
		tabs: [
			{ routePattern: '/school/staff/[id]', tab: 'profile' },
			{ routePattern: '/school/staff/[id]', tab: 'permissions' },
			{ routePattern: '/school/staff/[id]', tab: 'assignments' },
			{ routePattern: '/school/teachers/[id]', tab: 'profile' },
			{ routePattern: '/school/teachers/[id]', tab: 'assignments' },
			{ routePattern: '/school/teachers/[id]', tab: 'availability' },
		],
	},
	{
		stepId: 'school.life',
		paths: [
			'/school/calendar',
			'/school/activities',
			'/school/activities/[id]/profile',
			'/school/activities/[id]/students',
			'/school/activities/[id]/classes',
			'/school/announcements',
			'/school/announcements/[id]',
			'/school/events',
			'/school/events/[id]',
		],
		modals: [
			{ parentRoute: '/school/calendar', modal: 'create' },
			{ parentRoute: '/school/calendar', modal: 'edit' },
			{ parentRoute: '/school/activities', modal: 'create' },
			{ parentRoute: '/school/announcements', modal: 'create' },
			{ parentRoute: '/school/announcements/[id]', modal: 'edit' },
			{ parentRoute: '/school/announcements/[id]', modal: 'add-target' },
			{ parentRoute: '/school/announcements/[id]', modal: 'publish' },
			{ parentRoute: '/school/events', modal: 'create' },
			{ parentRoute: '/school/events/[id]', modal: 'edit' },
			{ parentRoute: '/school/events/[id]', modal: 'resolve' },
		],
		tabs: [
			{ routePattern: '/school/activities/[id]', tab: 'profile' },
			{ routePattern: '/school/activities/[id]', tab: 'students' },
			{ routePattern: '/school/activities/[id]', tab: 'classes' },
		],
	},
	{
		stepId: 'teaching.link',
		paths: [
			'/configuration/classes/[id]/assignments',
			'/classes/[classId]/teaching',
			'/classes/[classId]/teaching/[id]/progression',
			'/classes/[classId]/teaching/[id]/logbook',
		],
		classSegments: ['teaching'],
		modals: [
			{ parentRoute: '/configuration/classes/[id]/assignments', modal: 'form' },
			{ parentRoute: '/classes/[classId]/teaching/[id]/progression', modal: 'edit-subject' },
		],
		tabs: [
			{ routePattern: '/configuration/classes/[id]', tab: 'assignments' },
			{ routePattern: '/classes/[classId]/teaching/[id]', tab: 'progression' },
			{ routePattern: '/classes/[classId]/teaching/[id]', tab: 'logbook' },
		],
	},
	{
		stepId: 'classes.ops',
		paths: [
			'/classes/[classId]/students',
			...STUDENT_TABS.map(tab => `/classes/[classId]/students/[id]/${tab}`),
			'/classes/[classId]/timetable',
			'/classes/[classId]/timetable/[sessionId]/details',
			'/classes/[classId]/timetable/[sessionId]/attendance',
			'/classes/[classId]/timetable/[sessionId]/logbook',
			'/classes/[classId]/evaluations',
			'/classes/[classId]/evaluations/[id]/details',
			'/classes/[classId]/evaluations/[id]/grading',
			'/classes/[classId]/attendance',
			'/classes/[classId]/attendance/[dayId]',
			'/classes/[classId]/report-cards',
			'/classes/[classId]/report-cards/[id]',
		],
		classSegments: ['students', 'timetable', 'evaluations', 'attendance', 'report-cards'],
		modals: [
			{ parentRoute: '/classes/[classId]/students', modal: 'create' },
		],
		tabs: [
			...STUDENT_TABS.map(tab => ({ routePattern: '/classes/[classId]/students/[id]', tab })),
			{ routePattern: '/classes/[classId]/evaluations/[id]', tab: 'details' },
			{ routePattern: '/classes/[classId]/evaluations/[id]', tab: 'grading' },
			{ routePattern: '/classes/[classId]/timetable/[sessionId]', tab: 'details' },
			{ routePattern: '/classes/[classId]/timetable/[sessionId]', tab: 'attendance' },
			{ routePattern: '/classes/[classId]/timetable/[sessionId]', tab: 'logbook' },
		],
	},
	{
		stepId: 'finance.ops',
		paths: ['/finance/fees', '/finance/billing', '/finance/billing/[id]', '/finance/payment'],
		modals: [
			{ parentRoute: '/finance/fees', modal: 'create' },
			{ parentRoute: '/finance/billing', modal: 'assign-fee' },
			{ parentRoute: '/finance/billing/[id]', modal: 'payment' },
		],
	},
	{
		stepId: 'na.change-class',
		modals: [{ parentRoute: '/school/students/[id]/profile', modal: 'change-class' }],
		naReason: 'Single-class journey — second class not created',
	},
	{
		stepId: 'na.auth-onboarding-permissions',
		naReason: 'Out of owner-session journey (auth, onboarding, extra-role, logout)',
	},
];

export function claimedPaths(): Set<string> {
	const paths = new Set<string>();
	for (const claim of JOURNEY_SURFACE_CLAIMS) {
		for (const path of claim.paths ?? []) {
			paths.add(path);
		}
		for (const segment of claim.classSegments ?? []) {
			paths.add(`/classes/[classId]/${segment}`);
		}
	}
	return paths;
}

export function claimedModals(): Set<string> {
	const keys = new Set<string>();
	for (const claim of JOURNEY_SURFACE_CLAIMS) {
		for (const modal of claim.modals ?? []) {
			keys.add(`${modal.parentRoute}::${modal.modal}`);
		}
	}
	return keys;
}

export function claimedTabs(): Set<string> {
	const keys = new Set<string>();
	for (const claim of JOURNEY_SURFACE_CLAIMS) {
		for (const tab of claim.tabs ?? []) {
			keys.add(`${tab.routePattern}::${tab.tab}`);
		}
	}
	return keys;
}
