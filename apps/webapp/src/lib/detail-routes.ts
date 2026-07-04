import type { ResolvedPathname } from '$app/types';
import type { DrawerItem } from '$lib/components/school/shared/drawer-types';
import type { Subject } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { appPath } from '$lib/navigation/app-navigation';
import { reportCardsContext } from '$lib/report-cards/context.svelte';

export interface ParsedDetail {
	item: NonNullable<DrawerItem>;
	listPath: ResolvedPathname;
}

function yearLabel(className: string): string {
	const map: Record<string, string> = {
		'6th': '6ème',
		'5th': '5ème',
		'4th': '4ème',
		'3rd': '3ème',
		'2nd': '2nde',
		'1st': '1ère',
		'Terminale': 'Terminale',
	};
	for (const key of Object.keys(map)) {
		if (className.startsWith(key))
			return map[key];
	}
	return className;
}

function getSubjectLevelGroup(label: string): { label: string; subtitle: string; items: Subject[] } | null {
	const classById = Object.fromEntries(academicContext.classes.map(c => [c.id, c]));
	const byYear: Record<string, { subtitle: string; items: Subject[] }> = {};
	for (const s of detailDataContext.subjects) {
		const cls = classById[s.classId];
		if (!cls)
			continue;
		const y = yearLabel(cls.name);
		if (!byYear[y])
			byYear[y] = { subtitle: cls.level, items: [] };
		byYear[y].items.push(s);
	}
	if (!byYear[label])
		return null;
	return { label, subtitle: byYear[label].subtitle, items: byYear[label].items };
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
		test: p => p.match(/^\/school\/announcements\/([^/]+)$/) ?? null,
		parse: (m) => {
			const announcement = detailDataContext.announcements.find(x => x.id === m[1]);
			return announcement
				? { item: { kind: 'announcement', data: announcement }, listPath: appPath('/(app)/school/announcements/[[id]]') }
				: null;
		},
	},
	{
		test: p => p.match(/^\/school\/activities\/([^/]+)$/) ?? null,
		parse: (m) => {
			const a = detailDataContext.activities.find(x => x.id === m[1]);
			return a ? { item: { kind: 'activity', data: a }, listPath: appPath('/(app)/school/activities/[[id]]') } : null;
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
		test: p => p.match(/^\/school\/calendar\/([^/]+)$/) ?? null,
		parse: (m) => {
			const ev = detailDataContext.schoolYearEvents.find(x => x.id === m[1]);
			return ev ? { item: { kind: 'schoolYearEvent', data: ev }, listPath: appPath('/(app)/school/calendar/[[id]]') } : null;
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
		test: p => p.match(/^\/classes\/([^/]+)\/homework\/([^/]+)$/) ?? null,
		parse: (m) => {
			const d = detailDataContext.deadlines.find(x => x.id === m[2] && x.classId === m[1]);
			return d ? { item: { kind: 'deadline', data: d }, listPath: appPath('/(app)/classes/[classId]/homework/[[id]]', { classId: m[1] }) } : null;
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
			const group = getSubjectLevelGroup(label);
			return group ? { item: { kind: 'level', data: group }, listPath: appPath('/(app)/configuration/subjects/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/subjects\/([^/]+)$/) ?? null,
		parse: (m) => {
			const s = detailDataContext.subjects.find(x => x.id === m[1]);
			return s ? { item: { kind: 'subject', data: s }, listPath: appPath('/(app)/configuration/subjects/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/school\/staff\/([^/]+)$/) ?? null,
		parse: (m) => {
			const id = m[1];
			if (id.startsWith('st')) {
				const s = detailDataContext.staff.find(x => x.id === id);
				return s ? { item: { kind: 'staff', data: s }, listPath: appPath('/(app)/school/staff/[[id]]') } : null;
			}
			const g = detailDataContext.guardians.find(x => x.id === id);
			return g ? { item: { kind: 'guardian', data: g }, listPath: appPath('/(app)/school/staff/[[id]]') } : null;
		},
	},
	{
		test: p => p.match(/^\/configuration\/roles\/([^/]+)$/) ?? null,
		parse: (m) => {
			const staffId = m[1];
			const member = detailDataContext.staff.find(entry => entry.id === staffId);
			if (!member) {
				return null;
			}
			return {
				item: { kind: 'staffPermissions', data: member },
				listPath: appPath('/(app)/configuration/roles/[[role]]'),
			};
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
		test: p => p.match(/^\/finance\/fees\/([^/]+)$/) ?? null,
		parse: (m) => {
			const f = detailDataContext.fees.find(x => x.id === m[1]);
			return f ? { item: { kind: 'fee', data: f }, listPath: appPath('/(app)/finance/fees/[[id]]') } : null;
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
	return parseDetailPath(pathname)?.listPath ?? null;
}
