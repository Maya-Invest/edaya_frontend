import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PaymentPageSlice } from './lib/payment-helpers';
import { refundAvailableBalanceMutation, reversePaymentMutation } from '$lib/api/mutations/billing-ops.mutations';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadPaymentSlice, queryPaymentListPage } from './lib/payment-queries';

const PAYMENT_VERSION_FAMILIES = ['billing', 'students', 'payments'] as const satisfies readonly EntityVersionKey[];

const PAYMENT_PAGE_STATE_KEY = Symbol('payment-page-state');

export type { PaymentPageSlice };

export class PaymentPageState {
	performRefundAvailableBalance = (...args: Parameters<typeof refundAvailableBalanceMutation>) => refundAvailableBalanceMutation(...args);

	performReversePayment = (...args: Parameters<typeof reversePaymentMutation>) => reversePaymentMutation(...args);

	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	slice = $state<PaymentPageSlice | null>(null);

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
		const data = await loadPaymentSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
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
