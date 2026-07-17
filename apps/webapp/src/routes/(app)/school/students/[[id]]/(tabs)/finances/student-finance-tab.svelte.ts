import type { Fee, StudentBilling } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadFinanceData } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { schoolStudentDetailIdFromUrl } from '../../../students-page.svelte';
import { billingStatusTone, summarizeStudentFinances } from './student-finance-tab.selectors';

export { billingStatusTone, summarizeStudentFinances };

const STUDENT_FINANCE_TAB_KEY = Symbol('student-finance-tab');

export interface StudentFinanceTabSlice {
	studentId: string;
	fees: Fee[];
	billing: StudentBilling[];
}

export type StudentFinanceTabSeed = Partial<Omit<StudentFinanceTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentFinanceTabSlice {
	return { studentId, fees: [], billing: [] };
}

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export class StudentFinanceTabState {
	slice = $state<StudentFinanceTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

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

	financesSummaryFor(studentId: string) {
		const billing = this.forStudent(studentId)?.billing ?? [];
		return summarizeStudentFinances(billing, studentId);
	}

	feesFor(studentId: string) {
		return this.forStudent(studentId)?.fees ?? [];
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = schoolStudentDetailIdFromUrl(url);
				if (!studentId) {
					return {};
				}

				const resolvedSchoolId = schoolId();
				if (!resolvedSchoolId) {
					return {};
				}

				const scope = {
					schoolId: resolvedSchoolId,
					academicYearId: academicContext.yearId,
				};
				const { fees, billing } = await loadFinanceData(getBrowserSchoolClient(), scope);
				this.seed(studentId, {
					fees,
					billing: billing.filter(item => item.studentId === studentId),
				});
				return {};
			},
			hasItems: () => true,
		});
	}
}

export function setStudentFinanceTabState(state: StudentFinanceTabState) {
	setContext(STUDENT_FINANCE_TAB_KEY, state);
}

export function getStudentFinanceTabState() {
	return getContext<StudentFinanceTabState>(STUDENT_FINANCE_TAB_KEY);
}
