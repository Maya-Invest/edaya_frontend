import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PaymentPageSlice } from './lib/payment-helpers';
import { listYearAccounts, loadStudentsByIds } from '$lib/api/finance-data';
import { financeReadKey, financeScope, readPaymentsPage, billingFilters } from '$lib/api/finance-workspace';
import { refundAvailableBalanceMutation, reversePaymentMutation } from '$lib/api/mutations/billing-ops.mutations';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { FinancePaymentDraft } from '$lib/finance/payment-draft.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { SvelteURL, SvelteSet } from 'svelte/reactivity';
import { loadPaymentSlice, queryPaymentListPage } from './lib/payment-queries';

const PAYMENT_VERSION_FAMILIES = ['billing', 'students', 'payments'] as const satisfies readonly EntityVersionKey[];

const PAYMENT_PAGE_STATE_KEY = Symbol('payment-page-state');

export type { PaymentPageSlice };

export class PaymentPageState {
	paymentDraft = new FinancePaymentDraft();
	performRefundAvailableBalance = (...args: Parameters<typeof refundAvailableBalanceMutation>) => refundAvailableBalanceMutation(...args);

	performReversePayment = (...args: Parameters<typeof reversePaymentMutation>) => reversePaymentMutation(...args);

	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	slice = $state<PaymentPageSlice | null>(null);

	constructor(private readonly getUrl: () => URL = () => new SvelteURL('https://local/finance/payment')) { }
	loadingMore = $state(false);
	moreError = $state(false);
	refundLoading = $state(false);
	refundError = $state(false);
	async loadRefundContext() {
		const key = financeReadKey('refund');
		this.refundLoading = true;
		this.refundError = false;
		try {
			const accounts = await listYearAccounts(getBrowserSchoolClient(), financeScope());
			const students = await loadStudentsByIds(getBrowserSchoolClient(), [...new SvelteSet(accounts.map(row => row.studentId))], financeScope().academicYearId);
			if (key === financeReadKey('refund') && this.slice)
				this.slice = { ...this.slice, accounts, students };
		}
		catch { this.refundError = true; }
		finally { this.refundLoading = false; }
	}

	async loadMore() {
		if (this.loadingMore || !this.slice || this.payments.length >= (this.slice.total ?? 0))
			return;
		const key = financeReadKey(JSON.stringify(billingFilters(this.getUrl())));
		this.loadingMore = true;
		this.moreError = false;
		try {
			const next = await readPaymentsPage(billingFilters(this.getUrl()), this.payments.length);
			if (key === financeReadKey(JSON.stringify(billingFilters(this.getUrl()))) && this.slice)
				this.slice = { ...this.slice, payments: [...this.payments, ...next.rows], total: next.total };
		}
		catch { this.moreError = true; }
		finally { this.loadingMore = false; }
	}

	private readonly versions = new RouteVersionSnapshot(PAYMENT_VERSION_FAMILIES);

	applySlice(data: PaymentPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get students() {
		return this.slice?.students ?? [];
	}

	get payments() {
		return this.slice?.payments ?? [];
	}

	get accounts() {
		return this.slice?.accounts ?? [];
	}

	queryListPage() {
		return queryPaymentListPage(this);
	}

	async refreshSlice() {
		const key = financeReadKey(JSON.stringify(billingFilters(this.getUrl())));
		const data = await loadPaymentSlice(this.getUrl());
		if (key === financeReadKey(JSON.stringify(billingFilters(this.getUrl()))))
			this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.hasLoaded() || !this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}
}

export function setPaymentPageState(state: PaymentPageState) {
	setContext(PAYMENT_PAGE_STATE_KEY, state);
}

export function getPaymentPageState() {
	return getContext<PaymentPageState>(PAYMENT_PAGE_STATE_KEY);
}
