import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { StudentBilling } from '$lib/types/school';
import type { BillingPageSlice } from './lib/billing-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { nowIso } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { runFinanceRouteMutation } from '../lib/finance-route-mutation';
import { billingDetailIdFromUrl } from './lib/billing-helpers';
import { loadBillingSlice, queryBillingListPage } from './lib/billing-queries';

type PaymentMethod = components['schemas']['RecordPaymentCommand']['method'];

const BILLING_VERSION_FAMILIES = ['fees', 'billing', 'students', 'payments'] as const satisfies readonly EntityVersionKey[];

const BILLING_PAGE_STATE_KEY = Symbol('billing-page-state');

export type { BillingPageSlice };

export class BillingPageState {
	slice = $state<BillingPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(BILLING_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {}

	applySlice(data: BillingPageSlice) {
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
		return this.billing.find(entry => entry.id === id);
	}

	feeFor(id: string) {
		return this.fees.find(fee => fee.id === id);
	}

	studentFor(id: string) {
		return this.students.find(student => student.id === id);
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

	patchBilling(id: string, patch: Partial<StudentBilling>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			billing: this.slice.billing.map(entry => entry.id === id ? { ...entry, ...patch } : entry),
		};
	}

	removeBilling(id: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			billing: this.slice.billing.filter(entry => entry.id !== id),
		};
	}

	queryListPage() {
		return queryBillingListPage(this);
	}

	async refreshSlice() {
		const data = await loadBillingSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async assignFeeToStudent(input: {
		studentId: string;
		feeId: string;
		expectedAmount?: number;
		dueDate?: string;
		successMessage?: string;
	}): Promise<string | null> {
		const client = getBrowserSchoolClient();
		const now = nowIso();
		const id = `sf-${Date.now().toString(36)}`;
		const fee = this.feeFor(input.feeId);
		const dueDate = input.dueDate ?? now.slice(0, 10);
		const total = input.expectedAmount ?? fee?.amount ?? 0;
		const optimistic: StudentBilling = {
			id,
			studentId: input.studentId,
			feeId: input.feeId,
			total,
			paid: 0,
			status: 'due',
			dueDate,
			installments: [{ date: dueDate, amount: total, status: 'pending' }],
		};

		const result = await runFinanceRouteMutation({
			request: () => client.commands.assignFeeToStudent({
				id,
				studentId: input.studentId,
				feeId: input.feeId,
				expectedAmount: input.expectedAmount,
				dueDate: input.dueDate ?? null,
				createdAt: now,
				referenceDate: now,
			}),
			successMessage: input.successMessage,
			versionKeys: ['billing'],
			apply: () => this.appendBilling(optimistic),
			rollback: () => this.removeBilling(id),
		});
		return result !== null ? id : null;
	}

	async recordPayment(input: {
		studentFeeId: string;
		amount: number;
		paymentDate: string;
		method: PaymentMethod;
		reference?: string;
		notes?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const now = nowIso();
		const id = `pay-${Date.now().toString(36)}`;
		const previous = this.selectedBilling(input.studentFeeId);

		const result = await runFinanceRouteMutation({
			request: () => client.commands.recordPayment({
				id,
				studentFeeId: input.studentFeeId,
				amount: input.amount,
				paymentDate: input.paymentDate,
				method: input.method,
				reference: input.reference?.trim() || null,
				notes: input.notes?.trim() || null,
				createdAt: now,
				referenceDate: input.paymentDate,
			}),
			successMessage: input.successMessage,
			versionKeys: ['payments', 'billing'],
			apply: () => {
				if (!previous) {
					return;
				}
				const paid = previous.paid + input.amount;
				const status = paid >= previous.total ? 'paid' : paid > 0 ? 'partial' : previous.status;
				this.patchBilling(input.studentFeeId, { paid, status });
			},
			rollback: () => {
				if (previous) {
					this.patchBilling(input.studentFeeId, previous);
				}
			},
		});
		return result !== null;
	}
}

export function setBillingPageState(state: BillingPageState) {
	setContext(BILLING_PAGE_STATE_KEY, state);
}

export function getBillingPageState() {
	return getContext<BillingPageState>(BILLING_PAGE_STATE_KEY);
}
