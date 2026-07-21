import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PaymentPageSlice } from './lib/payment-helpers';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadPaymentSlice, queryPaymentListPage } from './lib/payment-queries';

const PAYMENT_VERSION_FAMILIES = ['fees', 'billing', 'students', 'payments'] as const satisfies readonly EntityVersionKey[];

const PAYMENT_PAGE_STATE_KEY = Symbol('payment-page-state');

export type { PaymentPageSlice };

export class PaymentPageState {
	slice = $state<PaymentPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(PAYMENT_VERSION_FAMILIES);

	applySlice(data: PaymentPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
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
