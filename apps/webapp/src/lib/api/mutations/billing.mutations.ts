import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

type PaymentMethod = components['schemas']['RecordPaymentCommand']['method'];

export async function assignFeeToStudentMutation(input: {
	studentId: string;
	feeId: string;
	expectedAmount?: number;
	dueDate?: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const id = `sf-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.assignFeeToStudent({
		id,
		studentId: input.studentId,
		feeId: input.feeId,
		expectedAmount: input.expectedAmount,
		dueDate: input.dueDate ?? null,
		createdAt: now,
		referenceDate: now,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['billing'],
	});

	return result ? id : null;
}

export async function recordPaymentMutation(input: {
	studentFeeId: string;
	amount: number;
	paymentDate: string;
	method: PaymentMethod;
	reference?: string;
	notes?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const now = new Date().toISOString();
	const id = `pay-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.recordPayment({
		id,
		studentFeeId: input.studentFeeId,
		amount: input.amount,
		paymentDate: input.paymentDate,
		method: input.method,
		reference: input.reference?.trim() || null,
		notes: input.notes?.trim() || null,
		createdAt: now,
		referenceDate: input.paymentDate,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['payments', 'billing'],
	});

	return result !== null;
}
