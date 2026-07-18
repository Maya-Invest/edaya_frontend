import {
	ACTIVITY_ID,
	CLASS_6A,
	CLASS_SUBJECT_ID,
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

export const DRAWER_TAB_ROUTE_CASES: readonly DrawerTabRouteCase[] = [
	{
		name: 'school students',
		tabs: ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments'],
		pathForTab: tab => schoolStudentPath(STUDENT_ID, tab),
		drawerPathPrefix: `/school/students/${STUDENT_ID}`,
	},
	{
		name: 'school staff',
		tabs: ['profile', 'permissions', 'assignments'],
		pathForTab: tab => schoolStaffPath(STAFF_ID, tab),
		drawerPathPrefix: `/school/staff/${STAFF_ID}`,
		skipReason: 'Permissions tab may require ACCESS_CONTROL_ASSIGN',
	},
	{
		name: 'school teachers',
		tabs: ['profile', 'assignments', 'availability'],
		pathForTab: tab => schoolTeacherPath(TEACHER_ID, tab),
		drawerPathPrefix: `/school/teachers/${TEACHER_ID}`,
	},
	{
		name: 'school activities',
		tabs: ['profile', 'students', 'classes'],
		pathForTab: tab => schoolActivityPath(ACTIVITY_ID, tab),
		drawerPathPrefix: `/school/activities/${ACTIVITY_ID}`,
	},
	{
		name: 'configuration classes',
		tabs: ['profile', 'assignments'],
		pathForTab: tab => configClassGroupPath(CLASS_6A, tab as 'profile' | 'assignments'),
		drawerPathPrefix: `/configuration/classes/${CLASS_6A}`,
	},
	{
		name: 'configuration subjects',
		tabs: ['progression', 'logbook'],
		pathForTab: tab => configSubjectPath(CLASS_SUBJECT_ID, tab as 'progression' | 'logbook'),
		drawerPathPrefix: `/configuration/subjects/${CLASS_SUBJECT_ID}`,
	},
	{
		name: 'class teaching',
		tabs: ['progression', 'logbook'],
		pathForTab: tab => classTeachingPath(CLASS_6A, CLASS_SUBJECT_ID, tab as 'progression' | 'logbook'),
		drawerPathPrefix: `/classes/${CLASS_6A}/teaching/${CLASS_SUBJECT_ID}`,
	},
	{
		name: 'class students',
		tabs: ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'enrollments'],
		pathForTab: tab => classStudentsPath(CLASS_6A, STUDENT_ID, tab),
		drawerPathPrefix: `/classes/${CLASS_6A}/students/${STUDENT_ID}`,
	},
];

export function classEvaluationsTabCase(evaluationId: string): DrawerTabRouteCase {
	return {
		name: 'class evaluations',
		tabs: ['details', 'grading'],
		pathForTab: tab => `/classes/${CLASS_6A}/evaluations/${evaluationId}/${tab}`,
		drawerPathPrefix: `/classes/${CLASS_6A}/evaluations/${evaluationId}`,
	};
}

export function classTimetableTabCase(sessionId: string): DrawerTabRouteCase {
	return {
		name: 'class timetable session',
		tabs: ['details', 'attendance', 'logbook'],
		pathForTab: tab => `/classes/${CLASS_6A}/timetable/${sessionId}/${tab}`,
		drawerPathPrefix: `/classes/${CLASS_6A}/timetable/${sessionId}`,
	};
}
