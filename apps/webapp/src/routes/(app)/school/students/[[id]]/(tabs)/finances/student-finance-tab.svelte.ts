import type { AccountStatement, StudentFinanceSummary } from '$lib/api/finance-types';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { loadStudentAccountStatement, loadStudentFinanceSummary } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { billingStatusTone } from './student-finance-tab.selectors';

export { billingStatusTone };

const STUDENT_FINANCE_TAB_KEY = Symbol('student-finance-tab');

export interface StudentFinanceTabSlice {
	studentId: string;
	summary: StudentFinanceSummary | null;
	statement: AccountStatement | null;
}

export type StudentFinanceTabSeed = Partial<Omit<StudentFinanceTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentFinanceTabSlice {
	return { studentId, summary: null, statement: null };
}

export class StudentFinanceTabState {
	slice = $state<StudentFinanceTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentDetailHost) {}

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentFinanceTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	summaryFor(studentId: string) {
		return this.forStudent(studentId)?.summary ?? null;
	}

	statementFor(studentId: string) {
		return this.forStudent(studentId)?.statement ?? null;
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const studentId = studentDetailIdFromPathname(url.pathname);
				const academicYearId = academicContext.yearId;
				if (!studentId || !academicYearId) {
					return {};
				}

				const client = getBrowserSchoolClient();
				const [summary, statement] = await Promise.all([
					loadStudentFinanceSummary(client, { studentId, academicYearId }),
					loadStudentAccountStatement(client, { studentId, academicYearId }),
				]);
				signal.throwIfAborted();
				this.seed(studentId, { summary, statement });
				return {};
			},
			hasItems: () => true,
		}, request);
	}
}

export function setStudentFinanceTabState(state: StudentFinanceTabState) {
	setContext(STUDENT_FINANCE_TAB_KEY, state);
}

export function getStudentFinanceTabState() {
	return getContext<StudentFinanceTabState>(STUDENT_FINANCE_TAB_KEY);
}
