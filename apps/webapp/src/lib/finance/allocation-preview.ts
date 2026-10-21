import type { AllocationPreview } from '$lib/api/finance-types';
import type { StudentBilling } from '$lib/types/school';

export function openChargesForAllocation(charges: readonly StudentBilling[]): StudentBilling[] {
	return charges
		.filter(charge => charge.remaining > 0 && charge.status !== 'cancelled' && charge.status !== 'waived')
		.slice()
		.sort((left, right) => (left.dueDate || '9999').localeCompare(right.dueDate || '9999') || (left.createdAt ?? '').localeCompare(right.createdAt ?? '') || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

export function previewFifoAllocation(
	accountId: string,
	amountMinor: number,
	availableBefore: number,
	charges: readonly StudentBilling[],
): AllocationPreview {
	let remaining = Math.max(0, Math.trunc(amountMinor));
	const allocations: AllocationPreview['allocations'] = [];
	for (const charge of openChargesForAllocation(charges)) {
		if (remaining <= 0) {
			break;
		}
		const applied = Math.min(remaining, charge.remaining);
		if (applied <= 0) {
			continue;
		}
		allocations.push({
			chargeId: charge.id,
			amount: applied,
			label: charge.label,
		});
		remaining -= applied;
	}
	return {
		accountId,
		availableBefore,
		availableAfter: availableBefore + remaining,
		allocations,
	};
}

export function previewTargetedAllocation(
	accountId: string,
	amountMinor: number,
	availableBefore: number,
	charge: StudentBilling,
): AllocationPreview {
	const applied = Math.min(Math.max(0, Math.trunc(amountMinor)), charge.remaining);
	return {
		accountId,
		availableBefore,
		availableAfter: availableBefore + Math.max(0, Math.trunc(amountMinor) - applied),
		allocations: applied > 0
			? [{ chargeId: charge.id, amount: applied, label: charge.label }]
			: [],
	};
}
