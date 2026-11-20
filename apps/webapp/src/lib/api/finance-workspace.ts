import type { FinanceOverview, StudentChargeRecord } from './finance-types';
import { academicContext } from '$lib/academic/context.svelte';
import { authSession } from '$lib/auth/session.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { financeQuery } from './finance-client';
import { mapPayments, mapStudentBilling } from './finance-data';
import { getBrowserSchoolClient } from './school-client';

export function financeScope() {
	return { schoolId: authSession.schoolId ?? '', academicYearId: academicContext.yearId };
}
export function financeReadKey(part: string) {
	return `${authSession.schoolId}|${academicContext.yearId}|${academicContext.scopeGeneration}|${authSession.subjectId}|${JSON.stringify(authSession.grants)}|finance:${part}|${entityVersions.fees}:${entityVersions.billing}:${entityVersions.payments}`;
}
export function readFinanceOverview(feeId?: string) {
	return financeQuery<FinanceOverview>(getBrowserSchoolClient(), feeId ? 'getFeeFinanceOverview' : 'getFinanceOverview', feeId ? 'get-fee-finance-overview' : 'get-finance-overview', { ...financeScope(), ...(feeId ? { feeId } : {}) });
}
export async function readBillingDetail(chargeId: string) {
	const row = await financeQuery<StudentChargeRecord | null>(getBrowserSchoolClient(), 'getFinanceBillingDetail', 'get-finance-billing-detail', { ...financeScope(), chargeId });
	return row ? mapStudentBilling([row])[0] ?? null : null;
}

export interface FinancePageFilters { dueFrom?: string; dueTo?: string; paymentId?: string; search?: string; classGroupId?: string; studentId?: string; feeId?: string; status?: string; due?: string; sort?: string; direction?: string }
export function billingFilters(url: URL): FinancePageFilters {
	const get = (key: string) => {
		const value = url.searchParams.get(key);
		return value && value !== 'all' ? value : undefined;
	};
	return { search: get('q'), classGroupId: get('class'), feeId: get('fee'), status: get('status'), due: get('due'), dueFrom: get('dueFrom'), dueTo: get('dueTo'), sort: get('sort'), direction: get('direction') };
}
export async function readBillingPage(filters: FinancePageFilters = {}, offset = 0) {
	const result = await financeQuery<{ rows: StudentChargeRecord[]; total: number }>(getBrowserSchoolClient(), 'getFinanceBillingPage', 'get-finance-billing-page', { ...financeScope(), ...filters, offset, limit: 50 });
	return { rows: result.rows.flatMap(row => mapStudentBilling([row])), total: result.total };
}
export async function readAllBilling(filters: FinancePageFilters = {}) {
	const scope = financeReadKey('export');
	const rows: ReturnType<typeof mapStudentBilling> = [];
	let total = 0;
	do {
		const page = await readBillingPage(filters, rows.length);
		if (scope !== financeReadKey('export'))
			throw new Error('Scope changed');
		rows.push(...page.rows);
		total = page.total;
		if (!page.rows.length)
			break;
	} while (rows.length < total);
	return rows;
}

export async function readPaymentsPage(filters: FinancePageFilters = {}, offset = 0) {
	const result = await financeQuery<{ rows: unknown[]; total: number }>(getBrowserSchoolClient(), 'getFinancePaymentsPage', 'get-finance-payments-page', { ...financeScope(), ...filters, offset, limit: 50 });
	return { rows: result.rows.flatMap(row => mapPayments([row])), total: result.total };
}
export async function readAllPayments(filters: FinancePageFilters = {}) {
	const scope = financeReadKey('export');
	const rows: ReturnType<typeof mapPayments> = [];
	let total = 0;
	do {
		const page = await readPaymentsPage(filters, rows.length);
		if (scope !== financeReadKey('export'))
			throw new Error('Scope changed');
		rows.push(...page.rows);
		total = page.total;
		if (!page.rows.length)
			break;
	} while (rows.length < total);
	return rows;
}
