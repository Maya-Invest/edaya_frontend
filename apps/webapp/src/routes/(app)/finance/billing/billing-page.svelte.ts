import type { AllocationPlan, PaymentMethod } from '$lib/api/finance-types';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { StudentBilling } from '$lib/types/school';
import type { BillingPageSlice } from './lib/billing-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { loadPaymentSettlementHistory } from '$lib/api/finance-data';
import { waiveStudentChargeMutation, cancelStudentChargeMutation, adjustStudentChargeMutation, previewAccountAllocationQuery, allocateAccountBalanceMutation, reverseAllocationMutation } from '$lib/api/mutations/billing-ops.mutations';
import {
	enrollStudentInServiceMutation,
	enrollStudentsInServiceMutation,
	recordPaymentMutation,
} from '$lib/api/mutations/billing.mutations';
import { requestDocumentIssuanceMutation, requestDocumentIssuanceBatchMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { billingDetailIdFromUrl } from './lib/billing-helpers';
import { loadBillingSlice, queryBillingListPage } from './lib/billing-queries';

const BILLING_VERSION_FAMILIES = ['fees', 'billing', 'students', 'payments'] as const satisfies readonly EntityVersionKey[];

const BILLING_PAGE_STATE_KEY = Symbol('billing-page-state');

export type { BillingPageSlice };

export class BillingPageState {
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
		return this.billing.find(entry => entry.id === id);
	}

	feeFor(id: string) {
		return this.fees.find(fee => fee.id === id);
	}

	studentFor(id: string) {
		return this.students.find(student => student.id === id);
	}

	accountForStudent(studentId: string) {
		return this.accounts.find(account => account.studentId === studentId);
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
