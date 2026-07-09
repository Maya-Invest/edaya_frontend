import type { components } from '$lib/api/schema';
import type { StudentBilling } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';

type PaymentMethod = components['schemas']['RecordPaymentCommand']['method'];

function billingSnapshot(studentFeeId: string): StudentBilling | undefined {
	return detailDataContext.billing.find(record => record.id === studentFeeId);
}

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
	const fee = detailDataContext.fees.find(entry => entry.id === input.feeId);
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
		apply: () => {
			detailDataContext.appendBilling(optimistic);
		},
		rollback: () => {
			detailDataContext.removeBilling(id);
		},
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
	const previous = billingSnapshot(input.studentFeeId);

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
		apply: () => {
			if (!previous) {
				return;
			}
			const paid = previous.paid + input.amount;
			const status = paid >= previous.total ? 'paid' : paid > 0 ? 'partial' : previous.status;
			detailDataContext.patchBilling(input.studentFeeId, { paid, status });
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchBilling(input.studentFeeId, previous);
			}
		},
	});

	return result !== null;
}
