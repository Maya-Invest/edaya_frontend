import { DRAWER_TAB_PATTERNS } from '../../../../scripts/qa-route-catalog';
import {
	ACTIVITY_ID,
	CATALOG_SUBJECT_ID,
	CLASS_6A,
	CLASS_SUBJECT_ID,
	SEEDED_TIMETABLE_WEEK,
	STAFF_ID,
	STUDENT_ID,
	TEACHER_ID,
} from './constants';
import {
	classStudentsPath,
	classTeachingPath,
	configClassGroupPath,
	configSubjectPath,
	schoolActivityPath,
	schoolStaffPath,
	schoolStudentPath,
	schoolTeacherPath,
} from './paths';

export interface DrawerTabRouteCase {
	/** Short label for step names */
	name: string;
	/** Tabs to deep-link and click (URL path segments) */
	tabs: readonly string[];
	/** Build drawer URL for a tab segment */
	pathForTab: (tab: string) => string;
	/** Expected pathname prefix after navigation */
	drawerPathPrefix: string;
	/** Optional skip reason (permissions, seed gaps) */
	skipReason?: string;
}

function tabsFor(name: string): readonly string[] {
	return DRAWER_TAB_PATTERNS.find(pattern => pattern.name === name)?.tabs ?? [];
}

export const DRAWER_TAB_ROUTE_CASES: readonly DrawerTabRouteCase[] = [
	{
		name: 'school students',
		tabs: tabsFor('school students'),
		pathForTab: tab => schoolStudentPath(STUDENT_ID, tab),
		drawerPathPrefix: `/school/students/${STUDENT_ID}`,
	},
	{
		name: 'school staff',
		tabs: tabsFor('school staff'),
		pathForTab: tab => schoolStaffPath(STAFF_ID, tab),
		drawerPathPrefix: `/school/staff/${STAFF_ID}`,
		skipReason: 'Permissions tab may require ACCESS_CONTROL_MANAGE',
	},
	{
		name: 'school teachers',
		tabs: tabsFor('school teachers'),
		pathForTab: tab => schoolTeacherPath(TEACHER_ID, tab),
		drawerPathPrefix: `/school/teachers/${TEACHER_ID}`,
	},
	{
		name: 'school activities',
		tabs: tabsFor('school activities'),
		pathForTab: tab => schoolActivityPath(ACTIVITY_ID, tab),
		drawerPathPrefix: `/school/activities/${ACTIVITY_ID}`,
	},
	{
		name: 'configuration classes',
		tabs: tabsFor('configuration classes'),
		pathForTab: tab => configClassGroupPath(CLASS_6A, tab as 'profile' | 'assignments'),
		drawerPathPrefix: `/configuration/structure/classes/${CLASS_6A}`,
	},
	{
		name: 'configuration subjects',
		tabs: ['progression'],
		pathForTab: tab => configSubjectPath(CATALOG_SUBJECT_ID, tab as 'progression' | 'logbook'),
		drawerPathPrefix: `/configuration/structure/subjects/${CATALOG_SUBJECT_ID}`,
	},
	{
		name: 'class teaching',
		tabs: tabsFor('class teaching'),
		pathForTab: tab => classTeachingPath(CLASS_6A, CLASS_SUBJECT_ID, tab as 'progression' | 'logbook'),
		drawerPathPrefix: `/classes/${CLASS_6A}/teaching/${CLASS_SUBJECT_ID}`,
	},
	{
		name: 'class students',
		tabs: tabsFor('class students'),
		pathForTab: tab => classStudentsPath(CLASS_6A, STUDENT_ID, tab),
		drawerPathPrefix: `/classes/${CLASS_6A}/students/${STUDENT_ID}`,
	},
];

export function classEvaluationsTabCase(evaluationId: string): DrawerTabRouteCase {
	return {
		name: 'class evaluations',
		tabs: tabsFor('class evaluations'),
		pathForTab: tab => `/classes/${CLASS_6A}/evaluations/${evaluationId}/${tab}`,
		drawerPathPrefix: `/classes/${CLASS_6A}/evaluations/${evaluationId}`,
	};
}

export function classTimetableTabCase(sessionId: string): DrawerTabRouteCase {
	return {
		name: 'class timetable session',
		tabs: tabsFor('class timetable session'),
		pathForTab: tab =>
			`/classes/${CLASS_6A}/timetable/${sessionId}/${tab}?week=${SEEDED_TIMETABLE_WEEK}`,
		drawerPathPrefix: `/classes/${CLASS_6A}/timetable/${sessionId}`,
	};
}
