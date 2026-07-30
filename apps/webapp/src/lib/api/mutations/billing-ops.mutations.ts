import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function adjustStudentFeeMutation(input: {
	studentFeeId: string;
	adjustmentAmount: number;
	reason: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const result = await runMutation(
		() => client.commands.adjustStudentFee({
			studentFeeId: input.studentFeeId,
			adjustmentAmount: input.adjustmentAmount,
			reason: input.reason.trim(),
			adjustedAt: now,
			updatedAt: now,
			referenceDate: now,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['billing'],
		},
	);
	return result !== null;
}

export async function cancelStudentFeeMutation(input: {
	studentFeeId: string;
	reason: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const result = await runMutation(
		() => client.commands.cancelStudentFee({
			studentFeeId: input.studentFeeId,
			reason: input.reason.trim(),
			cancelledAt: now,
			updatedAt: now,
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
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const result = await runMutation(
		() => client.commands.reversePayment({
			paymentId: input.paymentId,
			reversedAt: now,
			updatedAt: now,
			referenceDate: now,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['payments', 'billing'],
		},
	);
	return result !== null;
}

export async function cancelPaymentMutation(input: {
	paymentId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const result = await runMutation(
		() => client.commands.cancelPayment({
			paymentId: input.paymentId,
			cancelledAt: now,
			updatedAt: now,
			referenceDate: now,
		}),
		{
			successMessage: input.successMessage,
			versionKeys: ['payments', 'billing'],
		},
	);
	return result !== null;
}
