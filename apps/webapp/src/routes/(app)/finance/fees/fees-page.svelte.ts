import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Fee } from '$lib/types/school';
import type { FeesPageSlice } from './lib/fees-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso } from '$lib/date/format';
import { t } from '$lib/i18n';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { toast } from '$lib/toast.svelte';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import {
	feeSavePayload,
	installmentsForPeriod,
	UI_TO_API_CATEGORY,
} from '../lib/fee-api-helpers';
import { runFinanceRouteMutation } from '../lib/finance-route-mutation';
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

	get billing() {
		return this.slice?.billing ?? [];
	}

	feeFor(id: string) {
		return this.fees.find(fee => fee.id === id);
	}

	usageCount(feeId: string): number {
		return this.billing.filter(row => row.feeId === feeId).length;
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
		period: Fee['period'];
		successMessage?: string;
	}): Promise<string | null> {
		const client = getBrowserSchoolClient();
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			toast.error(get(t)('fee.noContext'));
			return null;
		}

		const id = `fee-${Date.now().toString(36)}`;
		const optimistic: Fee = {
			id,
			name: input.name.trim(),
			category: input.category,
			amount: input.amount,
			period: input.period,
		};

		const result = await runFinanceRouteMutation({
			request: () => client.commands.createFee({
				id,
				schoolId,
				academicYearId,
				name: input.name.trim(),
				category: UI_TO_API_CATEGORY[input.category],
				defaultAmount: input.amount,
				currency: 'XOF',
				installments: installmentsForPeriod(input.period),
				createdAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['fees'],
			apply: () => this.appendFee(optimistic),
			rollback: () => this.removeFee(id),
		});
		return result !== null ? id : null;
	}

	async updateFee(input: {
		feeId: string;
		name: string;
		category: Fee['category'];
		amount: number;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.feeFor(input.feeId);
		const patch = {
			name: input.name.trim(),
			category: input.category,
			amount: input.amount,
		};

		const result = await runFinanceRouteMutation({
			request: async () => {
				const existing = await client.entities.fees.get(input.feeId);
				return client.entities.fees.save(feeSavePayload(existing, {
					name: input.name.trim(),
					category: UI_TO_API_CATEGORY[input.category],
					amount: input.amount,
				}));
			},
			successMessage: input.successMessage,
			versionKeys: ['fees'],
			apply: () => this.patchFee(input.feeId, patch),
			rollback: () => {
				if (previous) {
					this.patchFee(input.feeId, previous);
				}
			},
		});
		return result !== null;
	}

	async deleteFee(input: {
		feeId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const previous = this.feeFor(input.feeId);

		const result = await runFinanceRouteMutation({
			request: () => client.entities.fees.delete({ id: input.feeId }),
			successMessage: input.successMessage,
			versionKeys: ['fees', 'billing'],
			apply: () => this.removeFee(input.feeId),
			rollback: () => {
				if (previous) {
					this.appendFee(previous);
				}
			},
		});
		return result !== null;
	}
}

export function setFeesPageState(state: FeesPageState) {
	setContext(FEES_PAGE_STATE_KEY, state);
}

export function getFeesPageState() {
	return getContext<FeesPageState>(FEES_PAGE_STATE_KEY);
}
