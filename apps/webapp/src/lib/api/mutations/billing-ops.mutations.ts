import type { AllocationPlan, AllocationPreview, PaymentMethod } from '$lib/api/finance-types';
import { financeCommand, financeQuery } from '$lib/api/finance-client';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

function newId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}`;
}

export async function adjustStudentChargeMutation(input: {
	chargeId: string;
	adjustmentAmount: number;
	reason: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'adjustStudentCharge', 'adjust-student-charge', {
			requestId: crypto.randomUUID(),
			chargeId: input.chargeId,
			adjustmentAmount: input.adjustmentAmount,
			reason: input.reason.trim(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['billing'],
		},
	);
	return result !== null;
}

export async function waiveStudentChargeMutation(input: {
	chargeId: string;
	reason: string;
	waiverAmount?: number;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'waiveStudentCharge', 'waive-student-charge', {
			requestId: crypto.randomUUID(),
			chargeId: input.chargeId,
			reason: input.reason.trim(),
			waiverAmount: input.waiverAmount,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['billing'],
		},
	);
	return result !== null;
}

export async function cancelStudentChargeMutation(input: {
	chargeId: string;
	reason: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'cancelStudentCharge', 'cancel-student-charge', {
			requestId: crypto.randomUUID(),
			chargeId: input.chargeId,
			reason: input.reason.trim(),
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['billing'],
		},
	);
	return result !== null;
}

export async function reversePaymentMutation(input: {
	paymentId: string;
	reverseAllocationIds?: readonly string[];
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'reversePayment', 'reverse-payment', {
			paymentId: input.paymentId,
			reverseAllocationIds: input.reverseAllocationIds ? [...input.reverseAllocationIds] : undefined,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['payments', 'billing'],
		},
	);
	return result !== null;
}

export async function allocateAccountBalanceMutation(input: {
	id?: string;
	accountId: string;
	allocation: AllocationPlan;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'allocateAccountBalance', 'allocate-account-balance', {
			id: input.id ?? newId('alc'),
			accountId: input.accountId,
			allocation: input.allocation,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['billing', 'payments'],
		},
	);
	return result !== null;
}

export async function reverseAllocationMutation(input: {
	allocationId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'reverseAllocation', 'reverse-allocation', {
			allocationId: input.allocationId,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['billing', 'payments'],
		},
	);
	return result !== null;
}

export async function refundAvailableBalanceMutation(input: {
	id?: string;
	accountId: string;
	amount: number;
	paymentDate: string;
	method: PaymentMethod;
	reference?: string;
	notes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => financeCommand(client, 'refundAvailableBalance', 'refund-available-balance', {
			id: input.id ?? newId('rfd'),
			accountId: input.accountId,
			amount: input.amount,
			paymentDate: input.paymentDate,
			method: input.method,
			reference: input.reference?.trim() || null,
			notes: input.notes?.trim() || null,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['payments', 'billing'],
		},
	);
	return result !== null;
}

export async function previewAccountAllocationQuery(input: {
	accountId: string;
	allocation: AllocationPlan;
}): Promise<AllocationPreview | null> {
	const client = getBrowserSchoolClient();
	try {
		return await financeQuery<AllocationPreview>(
			client,
			'previewAccountAllocation',
			'preview-account-allocation',
			input,
		);
	}
	catch {
		return null;
	}
}
