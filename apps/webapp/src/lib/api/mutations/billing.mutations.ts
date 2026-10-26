import type {
	AllocationPlan,
	AutoBillingConfiguration,
	CatalogServiceCategory,
	OneTimeBillingTerms,
	PaymentMethod,
} from '$lib/api/finance-types';
import { academicContext } from '$lib/academic/context.svelte';
import { financeCommand } from '$lib/api/finance-client';
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
	description?: string | null;
	category: CatalogServiceCategory;
	amount: number;
	currency?: string;
	autoBilling?: AutoBillingConfiguration;
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

	const currency = authSession.school?.financeCurrency;
	if (!currency) {
		toast.error(get(t)('finance.currencyRequired'));
		return null;
	}
	const id = newId('svc');
	const result = await runMutation(() => financeCommand(client, 'createCatalogService', 'create-catalog-service', {
		id,
		academicYearId,
		name: input.name.trim(),
		description: input.description ?? undefined,
		category: input.category,
		autoBilling: input.autoBilling ?? { mode: 'off' },
		defaultPrice: input.amount,
		currency: input.currency?.trim() || currency,
		billingTerms: input.billingTerms ?? { kind: 'one_time', installments: [] },
		status: input.status ?? 'active',
	}), {
		successMessage: input.successMessage,
		versionKeys: ['fees', 'billing', 'payments'],
	});
	return result ? id : null;
}

export async function updateCatalogServiceMutation(input: {
	id: string;
	name?: string;
	description?: string | null;
	category?: CatalogServiceCategory;
	amount?: number;
	autoBilling?: AutoBillingConfiguration;
	billingTerms?: OneTimeBillingTerms;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => financeCommand(client, 'updateCatalogService', 'update-catalog-service', {
		requestId: crypto.randomUUID(),
		id: input.id,
		name: input.name?.trim(),
		description: input.description,
		category: input.category,
		defaultPrice: input.amount,
		autoBilling: input.autoBilling,
		billingTerms: input.billingTerms,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['fees', 'billing', 'payments'],
	});
	return result !== null;
}

export async function activateCatalogServiceMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'activateCatalogService', 'activate-catalog-service', { id: input.id, requestId: crypto.randomUUID() }),
		{
			successMessage: input.successMessage,
			versionKeys: ['fees', 'billing', 'payments'],
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
		() => financeCommand(client, 'archiveCatalogService', 'archive-catalog-service', { id: input.id, requestId: crypto.randomUUID() }),
		{
			successMessage: input.successMessage,
			versionKeys: ['fees', 'billing', 'payments'],
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
		versionKeys: ['fees', 'billing', 'payments'],
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
		versionKeys: ['fees', 'billing', 'payments'],
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
	const reference = input.reference?.trim();
	const notes = input.notes?.trim();
	const result = await runMutation(() => financeCommand(client, 'recordPayment', 'record-payment', {
		id: input.id ?? newId('pay'),
		accountId: input.accountId,
		studentId: input.studentId,
		academicYearId: input.academicYearId,
		amount: input.amount,
		paymentDate: input.paymentDate,
		method: input.method,
		...(reference ? { reference } : {}),
		...(notes ? { notes } : {}),
		allocation: input.allocation,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['fees', 'billing', 'payments'],
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
