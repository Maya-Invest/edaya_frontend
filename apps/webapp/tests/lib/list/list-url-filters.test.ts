import { describe, expect, it } from 'bun:test';
import {
	readAcademicAdminListFilters,
	readActivityListFilters,
	readCalendarListFilters,
	readClassGroupListFilters,
	readClassReportCardListFilters,
	readClassStudentListFilters,
	readConfigSubjectListFilters,
	readEducatorDashboardListFilters,
	readFeeListFilters,
	readGradeScaleListFilters,
	readPaymentListFilters,
	readPlanningListFilters,
	readReportCardDefinitionListFilters,
	readResourceListFilters,
	readRoleListFilters,
	readStudentListFilters,
	readTeachingListFilters,
	writeAcademicAdminListFilters,
	writeActivityListFilters,
	writeCalendarListFilters,
	writeClassGroupListFilters,
	writeClassReportCardListFilters,
	writeClassStudentListFilters,
	writeConfigSubjectListFilters,
	writeEducatorDashboardListFilters,
	writeFeeListFilters,
	writeGradeScaleListFilters,
	writePaymentListFilters,
	writePlanningListFilters,
	writeReportCardDefinitionListFilters,
	writeResourceListFilters,
	writeRoleListFilters,
	writeStudentListFilters,
	writeTeachingListFilters,
} from '$lib/list/list-url-filters';

interface FilterCase {
	name: string;
	read: (url: URL) => Record<string, string>;
	write: (url: URL, filters: Record<string, string>) => string;
	defaults: Record<string, string>;
	nonDefault: Record<string, string>;
	normalize?: { input: string; expected: Record<string, string> };
}

function writeWith<T extends Record<string, string>>(
	writer: (url: URL, filters: T) => string,
): (url: URL, filters: Record<string, string>) => string {
	return (url, filters) => writer(url, filters as T);
}

const cases: FilterCase[] = [
	{
		name: 'fees',
		read: readFeeListFilters,
		write: writeWith(writeFeeListFilters),
		defaults: { q: '', category: 'all', status: 'all' },
		nonDefault: { q: 'tuition', category: 'tuition', status: 'active' },
	},
	{
		name: 'calendar',
		read: readCalendarListFilters,
		write: writeWith(writeCalendarListFilters),
		defaults: { q: '', type: 'all' },
		nonDefault: { q: 'math', type: 'exam' },
	},
	{
		name: 'config subjects',
		read: readConfigSubjectListFilters,
		write: writeWith(writeConfigSubjectListFilters),
		defaults: { q: '', gradeLevel: 'all' },
		nonDefault: { q: 'bio', gradeLevel: 'gl-6' },
	},
	{
		name: 'teaching log',
		read: readTeachingListFilters,
		write: writeWith(writeTeachingListFilters),
		defaults: { q: '' },
		nonDefault: { q: 'journal' },
	},
	{
		name: 'planning',
		read: readPlanningListFilters,
		write: writeWith(writePlanningListFilters),
		defaults: { q: '', week: '' },
		nonDefault: { q: 'room', week: '2026-05-18' },
	},
	{
		name: 'class students',
		read: readClassStudentListFilters,
		write: writeWith(writeClassStudentListFilters),
		defaults: { q: '', status: 'all' },
		nonDefault: { q: 'ada', status: 'active' },
	},
	{
		name: 'activities',
		read: readActivityListFilters,
		write: writeWith(writeActivityListFilters),
		defaults: { q: '', category: 'all', sort: 'roster', sortDir: 'asc' },
		nonDefault: { q: 'sport', category: 'Arts', sort: 'name', sortDir: 'desc' },
	},
	{
		name: 'school students',
		read: readStudentListFilters,
		write: writeWith(writeStudentListFilters),
		defaults: { q: '', class: 'all', status: 'all', photoReview: 'all', sort: 'roster', sortDir: 'asc' },
		nonDefault: { q: 'lee', class: 'class-1', status: 'warning', photoReview: 'pending', sort: 'name', sortDir: 'desc' },
	},
	{
		name: 'class report cards',
		read: readClassReportCardListFilters,
		write: writeWith(writeClassReportCardListFilters),
		defaults: { q: '', status: 'all' },
		nonDefault: { q: 'term', status: 'published' },
	},
	{
		name: 'payments',
		read: readPaymentListFilters,
		write: writeWith(writePaymentListFilters),
		defaults: { q: '', status: 'all', class: 'all' },
		nonDefault: { q: 'fee', status: 'overdue', class: 'class-2' },
	},
	{
		name: 'report card definitions',
		read: readReportCardDefinitionListFilters,
		write: writeWith(writeReportCardDefinitionListFilters),
		defaults: { q: '', status: 'all' },
		nonDefault: { q: 'trimester', status: 'draft' },
	},
	{
		name: 'roles',
		read: readRoleListFilters,
		write: writeWith(writeRoleListFilters),
		defaults: { q: '' },
		nonDefault: { q: 'admin' },
	},
	{
		name: 'grade scales',
		read: readGradeScaleListFilters,
		write: writeWith(writeGradeScaleListFilters),
		defaults: { q: '' },
		nonDefault: { q: '20' },
	},
	{
		name: 'class groups',
		read: readClassGroupListFilters,
		write: writeWith(writeClassGroupListFilters),
		defaults: { q: '' },
		nonDefault: { q: '6e' },
	},
	{
		name: 'academic admin',
		read: readAcademicAdminListFilters,
		write: writeWith(writeAcademicAdminListFilters),
		defaults: { q: '', status: 'all' },
		nonDefault: { q: 'year', status: 'published' },
	},
	{
		name: 'resources',
		read: readResourceListFilters,
		write: writeWith(writeResourceListFilters),
		defaults: { q: '', status: 'all' },
		nonDefault: { q: 'lab', status: 'busy' },
	},
	{
		name: 'educator dashboard',
		read: readEducatorDashboardListFilters,
		write: writeWith(writeEducatorDashboardListFilters),
		defaults: { q: '', tab: 'schoollife' },
		nonDefault: { q: 'note', tab: 'grades' },
		normalize: { input: '?tab=invalid', expected: { q: '', tab: 'schoollife' } },
	},
];

function url(path: string): URL {
	return new URL(path, 'https://school.test');
}

describe('list URL filter codecs', () => {
	for (const filterCase of cases) {
		describe(filterCase.name, () => {
			it('reads defaults from an empty query', () => {
				expect(filterCase.read(url('/list'))).toEqual(filterCase.defaults);
			});

			it('omits default values when writing', () => {
				const href = filterCase.write(url('/classes/abc/students'), filterCase.defaults);
				expect(href).toBe('/classes/abc/students');
			});

			it('round-trips non-default filters', () => {
				const base = url('/classes/abc/students?drawer=student-1');
				const href = filterCase.write(base, filterCase.nonDefault);
				expect(href).toContain('drawer=student-1');
				expect(filterCase.read(url(href))).toEqual(filterCase.nonDefault);
			});

			it('trims search text and drops empty values', () => {
				if (!('q' in filterCase.defaults))
					return;
				const href = filterCase.write(url('/list'), { ...filterCase.nonDefault, q: '  ada  ' });
				expect(href).toContain('q=ada');
				expect(href).not.toContain('q=%20');
			});

			if (filterCase.normalize) {
				const normalize = filterCase.normalize;
				it('normalizes invalid enum values', () => {
					const readUrl = url(`/list${normalize.input}`);
					expect(filterCase.read(readUrl)).toEqual(normalize.expected);
				});
			}
		});
	}
});
