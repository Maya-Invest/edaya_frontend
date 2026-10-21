import type { AllocationPlan, PaymentMethod } from '$lib/api/finance-types';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { StudentBilling } from '$lib/types/school';
import type { BillingPageSlice } from './lib/billing-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { loadPaymentSettlementHistory } from '$lib/api/finance-data';
import { readBillingDetail, financeReadKey, readBillingPage, billingFilters } from '$lib/api/finance-workspace';
import { waiveStudentChargeMutation, cancelStudentChargeMutation, adjustStudentChargeMutation, previewAccountAllocationQuery, allocateAccountBalanceMutation, reverseAllocationMutation } from '$lib/api/mutations/billing-ops.mutations';
import {
	enrollStudentInServiceMutation,
	enrollStudentsInServiceMutation,
	recordPaymentMutation,
} from '$lib/api/mutations/billing.mutations';
import { requestDocumentIssuanceMutation, requestDocumentIssuanceBatchMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { FinancePaymentDraft } from '$lib/finance/payment-draft.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { billingDetailIdFromUrl } from './lib/billing-helpers';
import { loadBillingSlice, queryBillingListPage } from './lib/billing-queries';

const BILLING_VERSION_FAMILIES = ['fees', 'billing', 'students', 'payments'] as const satisfies readonly EntityVersionKey[];

const BILLING_PAGE_STATE_KEY = Symbol('billing-page-state');

export type { BillingPageSlice };

export class BillingPageState {
	paymentDraft = new FinancePaymentDraft();
	loadSettlementHistory = (...args: Parameters<typeof loadPaymentSettlementHistory> extends [unknown, ...infer Rest] ? Rest : never) => loadPaymentSettlementHistory(getBrowserSchoolClient(), ...args);

	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	performWaiveStudentCharge = (...args: Parameters<typeof waiveStudentChargeMutation>) => waiveStudentChargeMutation(...args);

	performCancelStudentCharge = (...args: Parameters<typeof cancelStudentChargeMutation>) => cancelStudentChargeMutation(...args);

	performAdjustStudentCharge = (...args: Parameters<typeof adjustStudentChargeMutation>) => adjustStudentChargeMutation(...args);

	performPreviewAccountAllocationQuery = (...args: Parameters<typeof previewAccountAllocationQuery>) => previewAccountAllocationQuery(...args);

	performAllocateAccountBalance = (...args: Parameters<typeof allocateAccountBalanceMutation>) => allocateAccountBalanceMutation(...args);

	performReverseAllocation = (...args: Parameters<typeof reverseAllocationMutation>) => reverseAllocationMutation(...args);

	performRequestDocumentIssuanceBatch = (...args: Parameters<typeof requestDocumentIssuanceBatchMutation>) => requestDocumentIssuanceBatchMutation(...args);

	slice = $state<BillingPageSlice | null>(null);
	detail = $state<StudentBilling | null>(null);
	queryDetail() {
		return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({ billing: null as StudentBilling | null }),
			load: async (signal) => {
				const key = financeReadKey('detail');
				const billing = await readBillingDetail(billingDetailIdFromUrl(url) ?? '');
				if (billing) {
					const account = await readBillingPage({ studentId: billing.studentId, due: 'outstanding' });
					billing.accountHasOpenCharges = account.total > 0;
				}
				signal.throwIfAborted();
				if (key === financeReadKey('detail'))
					this.detail = billing;
				return { billing };
			},
			hasItems: data => Boolean(data.billing),
		}, request);
	}

	private historyCache: { key: string; history: Awaited<ReturnType<typeof loadPaymentSettlementHistory>> } | null = null;
	queryHistory(accountId: () => string) {
		return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({ history: null as Awaited<ReturnType<typeof loadPaymentSettlementHistory>> }),
			load: async (signal) => {
				const id = accountId();
				const key = financeReadKey(`history:${id}`);
				if (this.historyCache?.key === key)
					return { history: this.historyCache.history };
				const history = id ? await this.loadSettlementHistory({ accountId: id }) : null;
				signal.throwIfAborted();
				if (id && !history)
					throw new Error('History unavailable');
				if (id === accountId() && key === financeReadKey(`history:${id}`))
					this.historyCache = { key, history };
				return { history };
			},
			hasItems: () => true,
		}, request);
	}

	private readonly versions = new RouteVersionSnapshot(BILLING_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) { }

	applySlice(data: BillingPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
		this.detail = null;
		this.historyCache = null;
	}

	get fees() {
		return this.slice?.fees ?? [];
	}

	get billing() {
		return this.slice?.billing ?? [];
	}

	get students() {
		return this.slice?.students ?? [];
	}

	get accounts() {
		return this.slice?.accounts ?? [];
	}

	get selectedId() {
		return billingDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		return this.selectedBilling(this.selectedId);
	}

	selectedBilling(id?: string) {
		if (!id) {
			return undefined;
		}
		return this.detail?.id === id ? this.detail : this.billing.find(entry => entry.id === id);
	}

	feeFor(id: string) {
		return this.fees.find(fee => fee.id === id);
	}

	studentFor(id: string) {
		return this.students.find(student => student.id === id);
	}

	accountForStudent(studentId: string) {
		const account = this.accounts.find(account => account.studentId === studentId);
		if (this.detail?.studentId === studentId && this.detail.accountId)
			return { id: this.detail.accountId, studentId, academicYearId: this.detail.academicYearId, currency: this.detail.currency, availableBalance: this.detail.availableCredit ?? 0 };
		return account;
	}

	appendBilling(record: StudentBilling) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			billing: [record, ...this.slice.billing.filter(entry => entry.id !== record.id)],
		};
	}

	queryListPage() {
		return queryBillingListPage(this);
	}

	loadingMore = $state(false);
	moreError = $state(false);
	async loadMore() {
		if (this.loadingMore || !this.slice || this.billing.length >= (this.slice.total ?? 0))
			return;
		const key = financeReadKey(JSON.stringify(billingFilters(this.getUrl())));
		this.loadingMore = true;
		this.moreError = false;
		try {
			const next = await readBillingPage(billingFilters(this.getUrl()), this.billing.length);
			if (key === financeReadKey(JSON.stringify(billingFilters(this.getUrl()))) && this.slice)
				this.slice = { ...this.slice, billing: [...this.billing, ...next.rows], total: next.total };
		}
		catch { this.moreError = true; }
		finally { this.loadingMore = false; }
	}

	async refreshSlice() {
		const key = financeReadKey(JSON.stringify(billingFilters(this.getUrl())));
		const data = await loadBillingSlice(this.getUrl());
		if (key === financeReadKey(JSON.stringify(billingFilters(this.getUrl()))))
			this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async enrollStudent(input: {
		studentId: string;
		catalogServiceId: string;
		priceOverride?: number;
		dueDate?: string;
		successMessage?: string;
	}): Promise<string | null> {
		const id = await enrollStudentInServiceMutation({
			studentId: input.studentId,
			catalogServiceId: input.catalogServiceId,
			priceOverride: input.priceOverride,
			dueDate: input.dueDate,
			successMessage: input.successMessage,
		});
		if (id) {
			await this.refreshSlice();
		}
		return id;
	}

	async enrollStudents(input: {
		catalogServiceId: string;
		studentIds: readonly string[];
		priceOverride?: number;
		dueDate?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const ok = await enrollStudentsInServiceMutation({
			catalogServiceId: input.catalogServiceId,
			studentIds: input.studentIds,
			priceOverride: input.priceOverride,
			dueDate: input.dueDate,
			successMessage: input.successMessage,
		});
		if (ok) {
			await this.refreshSlice();
		}
		return ok;
	}

	async recordPayment(input: {
		studentId: string;
		accountId?: string;
		amount: number;
		paymentDate: string;
		method: PaymentMethod;
		reference?: string;
		notes?: string;
		allocation?: AllocationPlan;
		successMessage?: string;
	}): Promise<boolean> {
		const ok = await recordPaymentMutation({
			studentId: input.studentId,
			accountId: input.accountId,
			academicYearId: academicContext.yearId || undefined,
			amount: input.amount,
			paymentDate: input.paymentDate,
			method: input.method,
			reference: input.reference,
			notes: input.notes,
			allocation: input.allocation,
			successMessage: input.successMessage,
		});
		if (ok) {
			await this.refreshSlice();
		}
		return ok;
	}
}

export function setBillingPageState(state: BillingPageState) {
	setContext(BILLING_PAGE_STATE_KEY, state);
}

export function getBillingPageState() {
	return getContext<BillingPageState>(BILLING_PAGE_STATE_KEY);
}
