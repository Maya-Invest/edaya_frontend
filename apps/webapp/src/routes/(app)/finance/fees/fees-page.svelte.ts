import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Fee } from '$lib/types/school';
import type { FeesPageSlice } from './lib/fees-helpers';
import { DEFAULT_CATALOG_CURRENCY } from '$lib/api/finance-types';
import {
	activateCatalogServiceMutation,
	archiveCatalogServiceMutation,
	createCatalogServiceMutation,
	updateCatalogServiceMutation,
} from '$lib/api/mutations/fee.mutations';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadFeesSlice, queryFeesListPage } from './lib/fees-queries';

const FEES_VERSION_FAMILIES = ['fees', 'billing'] as const satisfies readonly EntityVersionKey[];

const FEES_PAGE_STATE_KEY = Symbol('fees-page-state');

export type { FeesPageSlice };

export class FeesPageState {
	slice = $state<FeesPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(FEES_VERSION_FAMILIES);

	applySlice(data: FeesPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get fees() {
		return this.slice?.fees ?? [];
	}

	feeFor(id: string) {
		return this.fees.find(fee => fee.id === id);
	}

	appendFee(fee: Fee) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			fees: [fee, ...this.slice.fees.filter(entry => entry.id !== fee.id)],
		};
	}

	patchFee(id: string, patch: Partial<Fee>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			fees: this.slice.fees.map(fee => fee.id === id ? { ...fee, ...patch } : fee),
		};
	}

	removeFee(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			fees: this.slice.fees.filter(fee => fee.id !== id),
		};
	}

	queryListPage() {
		return queryFeesListPage(this);
	}

	async refreshSlice() {
		const data = await loadFeesSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async createFee(input: {
		name: string;
		category: Fee['category'];
		amount: number;
		currency?: string;
		enrollmentMode?: Fee['enrollmentMode'];
		successMessage?: string;
	}): Promise<string | null> {
		const id = await createCatalogServiceMutation({
			name: input.name,
			category: input.category,
			amount: input.amount,
			currency: input.currency,
			enrollmentMode: input.enrollmentMode,
			status: 'active',
			successMessage: input.successMessage,
		});
		if (id) {
			this.appendFee({
				id,
				name: input.name.trim(),
				category: input.category,
				amount: input.amount,
				currency: input.currency?.trim() || DEFAULT_CATALOG_CURRENCY,
				status: 'active',
				enrollmentMode: input.enrollmentMode ?? 'mandatory',
				installmentCount: 0,
			});
		}
		return id;
	}

	async updateFee(input: {
		feeId: string;
		name: string;
		category: Fee['category'];
		amount: number;
		enrollmentMode?: Fee['enrollmentMode'];
		successMessage?: string;
	}): Promise<boolean> {
		const previous = this.feeFor(input.feeId);
		const ok = await updateCatalogServiceMutation({
			id: input.feeId,
			name: input.name,
			category: input.category,
			amount: input.amount,
			enrollmentMode: input.enrollmentMode,
			successMessage: input.successMessage,
		});
		if (ok) {
			this.patchFee(input.feeId, {
				name: input.name.trim(),
				category: input.category,
				amount: input.amount,
				enrollmentMode: input.enrollmentMode ?? previous?.enrollmentMode,
			});
		}
		return ok;
	}

	async activateFee(input: { feeId: string; successMessage?: string }): Promise<boolean> {
		const ok = await activateCatalogServiceMutation({
			id: input.feeId,
			successMessage: input.successMessage,
		});
		if (ok) {
			this.patchFee(input.feeId, { status: 'active' });
		}
		return ok;
	}

	async archiveFee(input: { feeId: string; successMessage?: string }): Promise<boolean> {
		const ok = await archiveCatalogServiceMutation({
			id: input.feeId,
			successMessage: input.successMessage,
		});
		if (ok) {
			this.patchFee(input.feeId, { status: 'archived' });
		}
		return ok;
	}
}

export function setFeesPageState(state: FeesPageState) {
	setContext(FEES_PAGE_STATE_KEY, state);
}

export function getFeesPageState() {
	return getContext<FeesPageState>(FEES_PAGE_STATE_KEY);
}
