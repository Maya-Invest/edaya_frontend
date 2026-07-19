import type { ResolvedPathname } from '$app/types';
import type { DrawerItem } from '$lib/components/school/shared/drawer-types';
import { academicContext } from '$lib/academic/context.svelte';
import { findSubjectLevelGroup } from '$lib/academic/subject-level-groups';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { appPath } from '$lib/navigation/app-navigation';
import { reportCardsContext } from '$lib/report-cards/context.svelte';

export interface ParsedDetail {
	item: NonNullable<DrawerItem>;
	listPath: ResolvedPathname;
}

interface Matcher {
	test: (pathname: string) => RegExpMatchArray | null;
	parse: (m: RegExpMatchArray) => ParsedDetail | null;
}

const matchers: Matcher[] = [
	{
		test: p => p.match(/^\/school\/students\/([^/]+)$/) ?? null,
		parse: (m) => {
			const s = detailDataContext.students.find(x => x.id === m[1]);
			return s ? { item: { kind: 'student', data: s }, listPath: appPath('/(app)/school/students/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/school\/guardians\/([^/]+)$/) ?? null,
		parse: (m) => {
			const g = detailDataContext.guardians.find(x => x.id === m[1]);
			return g ? { item: { kind: 'guardian', data: g }, listPath: appPath('/(app)/school/guardians/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/school\/teachers\/([^/]+)$/) ?? null,
		parse: (m) => {
			const teacher = detailDataContext.teachers.find(x => x.id === m[1]);
			return teacher
				? { item: { kind: 'teacher', data: teacher }, listPath: appPath('/(app)/school/teachers/[[id]]') }
				: null;
		},
	},
	{
		test: p => p.match(/^\/school\/announcements\/([^/]+)$/) ?? null,
		parse: (m) => {
			const announcement = detailDataContext.announcements.find(x => x.id === m[1]);
			return announcement
				? { item: { kind: 'announcement', data: announcement }, listPath: appPath('/(app)/school/announcements/[[id]]') }
				: null;
		},
	},
	{
		test: p => p.match(/^\/school\/events\/([^/]+)$/) ?? null,
		parse: (m) => {
			const i = detailDataContext.incidents.find(x => x.id === m[1]);
			return i ? { item: { kind: 'incident', data: i }, listPath: appPath('/(app)/school/events/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/students\/([^/]+)$/) ?? null,
		parse: (m) => {
			const s = detailDataContext.students.find(x => x.id === m[2]);
			return s ? { item: { kind: 'student', data: s }, listPath: appPath('/(app)/classes/[classId]/students/[[id]]', { classId: m[1] }) } : null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/subjects\/([^/]+)$/) ?? null,
		parse: (m) => {
			const s = detailDataContext.subjects.find(x => x.id === m[2]);
			return s ? { item: { kind: 'subject', data: s }, listPath: appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId: m[1] }) } : null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/timetable\/([^/]+)$/) ?? null,
		parse: (m) => {
			const ev = detailDataContext.planning.find(x => x.id === m[2]);
			return ev ? { item: { kind: 'planning', data: ev }, listPath: appPath('/(app)/classes/[classId]/timetable/[[id]]', { classId: m[1] }) } : null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/evaluations\/([^/]+)$/) ?? null,
		parse: (m) => {
			const ev = detailDataContext.evaluations.find(x => x.id === m[2]);
			return ev ? { item: { kind: 'evaluation', data: ev }, listPath: appPath('/(app)/classes/[classId]/evaluations/[[id]]', { classId: m[1] }) } : null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/attendance\/([^/]+)$/) ?? null,
		parse: (m) => {
			const day = detailDataContext.attendanceDays.find(x => x.id === m[2]);
			return day
				? { item: { kind: 'attendanceDay', data: day }, listPath: appPath('/(app)/classes/[classId]/attendance/[[id]]', { classId: m[1] }) }
				: null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/teaching\/([^/]+)$/) ?? null,
		parse: (m) => {
			const s = detailDataContext.subjects.find(x => x.id === m[2]);
			return s ? { item: { kind: 'subject', data: s }, listPath: appPath('/(app)/classes/[classId]/teaching/[[id]]', { classId: m[1] }) } : null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/subjects\/level\/([^/]+)$/) ?? null,
		parse: (m) => {
			const label = decodeURIComponent(m[1]);
			const group = findSubjectLevelGroup(
				label,
				detailDataContext.catalogSubjects,
				academicContext.classes,
				academicContext.gradeLevels,
			);
			return group ? { item: { kind: 'level', data: group }, listPath: appPath('/(app)/configuration/subjects/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/subjects\/([^/]+)$/) ?? null,
		parse: (m) => {
			const s = detailDataContext.catalogSubjects.find(x => x.id === m[1]);
			return s ? { item: { kind: 'catalogSubject', data: s }, listPath: appPath('/(app)/configuration/subjects/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/school\/staff\/([^/]+)$/) ?? null,
		parse: (m) => {
			const id = m[1];
			const s = detailDataContext.staff.find(x => x.id === id);
			if (s) {
				return { item: { kind: 'staff', data: s }, listPath: appPath('/(app)/school/staff/[[id]]') };
			}
			const g = detailDataContext.guardians.find(x => x.id === id);
			return g ? { item: { kind: 'guardian', data: g }, listPath: appPath('/(app)/school/staff/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/finance\/billing\/([^/]+)$/) ?? null,
		parse: (m) => {
			const b = detailDataContext.billing.find(x => x.id === m[1]);
			return b ? { item: { kind: 'billing', data: b }, listPath: appPath('/(app)/finance/billing/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/report-cards\/([^/]+)$/) ?? null,
		parse: (m) => {
			const d = reportCardsContext.definitions.find(x => x.id === m[1]);
			return d
				? { item: { kind: 'reportCardDefinition', data: d }, listPath: appPath('/(app)/configuration/report-cards/[[id]]') }
				: null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/grade-levels\/([^/]+)$/) ?? null,
		parse: (m) => {
			const level = academicContext.gradeLevelById(m[1]);
			return level
				? { item: { kind: 'gradeLevel', data: level }, listPath: appPath('/(app)/configuration/grade-levels/[[id]]') }
				: null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/classes\/([^/]+)$/) ?? null,
		parse: (m) => {
			const classGroup = academicContext.classes.find(x => x.id === m[1]);
			return classGroup
				? { item: { kind: 'classGroup', data: classGroup }, listPath: appPath('/(app)/configuration/classes/[[id]]') }
				: null;
		},
	},
	{
		test: p => p.match(/^\/classes\/([^/]+)\/report-cards\/([^/]+)$/) ?? null,
		parse: (m) => {
			const r = reportCardsContext.results.find(x => x.id === m[2]);
			return r
				? {
						item: { kind: 'reportCardResult', data: r },
						listPath: appPath('/(app)/classes/[classId]/report-cards/[[id]]', { classId: m[1] }),
					}
				: null;
		},
	},
];

export function parseDetailPath(pathname: string): ParsedDetail | null {
	for (const { test, parse } of matchers) {
		const m = test(pathname);
		if (m)
			return parse(m);
	}
	return null;
}

export function getListPathForDetail(pathname: string): ResolvedPathname | null {
	const parsed = parseDetailPath(pathname);
	if (parsed) {
		return parsed.listPath;
	}
	return listPathFromDetailPathname(pathname);
}

/** List path when the detail entity was already removed (e.g. after delete + shell refresh). */
function listPathFromDetailPathname(pathname: string): ResolvedPathname | null {
	const rules: { test: RegExp; listPath: ResolvedPathname }[] = [
		{ test: /^\/configuration\/classes\/[^/]+$/, listPath: appPath('/(app)/configuration/classes/[[id]]') },
		{ test: /^\/configuration\/grade-levels\/[^/]+$/, listPath: appPath('/(app)/configuration/grade-levels/[[id]]') },
		{ test: /^\/configuration\/subjects\/[^/]+$/, listPath: appPath('/(app)/configuration/subjects/[[id]]') },
		{ test: /^\/configuration\/report-cards\/[^/]+$/, listPath: appPath('/(app)/configuration/report-cards/[[id]]') },
		{ test: /^\/school\/students\/[^/]+$/, listPath: appPath('/(app)/school/students/[[id]]') },
		{ test: /^\/school\/guardians\/[^/]+$/, listPath: appPath('/(app)/school/guardians/[[id]]') },
		{ test: /^\/school\/teachers\/[^/]+$/, listPath: appPath('/(app)/school/teachers/[[id]]') },
		{ test: /^\/school\/staff\/[^/]+$/, listPath: appPath('/(app)/school/staff/[[id]]') },
		{ test: /^\/school\/announcements\/[^/]+$/, listPath: appPath('/(app)/school/announcements/[[id]]') },
		{ test: /^\/school\/events\/[^/]+$/, listPath: appPath('/(app)/school/events/[[id]]') },
		{ test: /^\/finance\/billing\/[^/]+$/, listPath: appPath('/(app)/finance/billing/[[id]]') },
	];
	for (const rule of rules) {
		if (rule.test.test(pathname)) {
			return rule.listPath;
		}
	}
	return null;
}
