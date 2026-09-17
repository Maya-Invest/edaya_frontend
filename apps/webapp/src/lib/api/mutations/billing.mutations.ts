import type {
	AllocationPlan,
	CatalogEnrollmentMode,
	CatalogServiceCategory,
	OneTimeBillingTerms,
	PaymentMethod,
} from '$lib/api/finance-types';
import { academicContext } from '$lib/academic/context.svelte';
import { financeCommand } from '$lib/api/finance-client';
import { DEFAULT_CATALOG_CURRENCY } from '$lib/api/finance-types';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function newId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}`;
}

export async function createCatalogServiceMutation(input: {
	name: string;
	category: CatalogServiceCategory;
	amount: number;
	currency?: string;
	enrollmentMode?: CatalogEnrollmentMode;
	billingTerms?: OneTimeBillingTerms;
	status?: 'draft' | 'active';
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		toast.error(get(t)('fee.noContext'));
		return null;
	}

	const id = newId('svc');
	const result = await runMutation(() => financeCommand(client, 'createCatalogService', 'create-catalog-service', {
		id,
		academicYearId,
		name: input.name.trim(),
		category: input.category,
		enrollmentMode: input.enrollmentMode ?? 'mandatory',
		defaultPrice: input.amount,
		currency: input.currency?.trim() || DEFAULT_CATALOG_CURRENCY,
		billingTerms: input.billingTerms ?? { kind: 'one_time', installments: [] },
		status: input.status ?? 'active',
	}), {
		successMessage: input.successMessage,
		versionKeys: ['fees'],
	});
	return result ? id : null;
}

export async function updateCatalogServiceMutation(input: {
	id: string;
	name?: string;
	category?: CatalogServiceCategory;
	amount?: number;
	enrollmentMode?: CatalogEnrollmentMode;
	billingTerms?: OneTimeBillingTerms;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => financeCommand(client, 'updateCatalogService', 'update-catalog-service', {
		id: input.id,
		name: input.name?.trim(),
		category: input.category,
		defaultPrice: input.amount,
		enrollmentMode: input.enrollmentMode,
		billingTerms: input.billingTerms,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['fees'],
	});
	return result !== null;
}

export async function activateCatalogServiceMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'activateCatalogService', 'activate-catalog-service', { id: input.id }),
		{
			successMessage: input.successMessage,
			versionKeys: ['fees'],
		},
	);
	return result !== null;
}

export async function archiveCatalogServiceMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'archiveCatalogService', 'archive-catalog-service', { id: input.id }),
		{
			successMessage: input.successMessage,
			versionKeys: ['fees', 'billing'],
		},
	);
	return result !== null;
}

export async function enrollStudentInServiceMutation(input: {
	id?: string;
	studentId: string;
	catalogServiceId: string;
	priceOverride?: number;
	dueDate?: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const id = input.id ?? newId('enr');
	const result = await runMutation(() => financeCommand(client, 'enrollStudentInService', 'enroll-student-in-service', {
		id,
		studentId: input.studentId,
		catalogServiceId: input.catalogServiceId,
		priceOverride: input.priceOverride,
		dueDate: input.dueDate ?? null,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['billing', 'fees'],
	});
	return result ? id : null;
}

export async function enrollStudentsInServiceMutation(input: {
	id?: string;
	catalogServiceId: string;
	studentIds: readonly string[];
	priceOverride?: number;
	dueDate?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => financeCommand(client, 'enrollStudentsInService', 'enroll-students-in-service', {
		id: input.id ?? newId('enb'),
		catalogServiceId: input.catalogServiceId,
		studentIds: [...input.studentIds],
		priceOverride: input.priceOverride,
		dueDate: input.dueDate ?? null,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['billing', 'fees'],
	});
	return result !== null;
}

export async function recordPaymentMutation(input: {
	id?: string;
	accountId?: string;
	studentId?: string;
	academicYearId?: string;
	amount: number;
	paymentDate: string;
	method: PaymentMethod;
	reference?: string;
	notes?: string;
	allocation?: AllocationPlan;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => financeCommand(client, 'recordPayment', 'record-payment', {
		id: input.id ?? newId('pay'),
		accountId: input.accountId,
		studentId: input.studentId,
		academicYearId: input.academicYearId,
		amount: input.amount,
		paymentDate: input.paymentDate,
		method: input.method,
		reference: input.reference?.trim() || null,
		notes: input.notes?.trim() || null,
		allocation: input.allocation,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['payments', 'billing'],
	});
	return result !== null;
}

export {
	adjustStudentChargeMutation,
	allocateAccountBalanceMutation,
	cancelStudentChargeMutation,
	previewAccountAllocationQuery,
	refundAvailableBalanceMutation,
	reverseAllocationMutation,
	reversePaymentMutation,
	waiveStudentChargeMutation,
} from './billing-ops.mutations';
