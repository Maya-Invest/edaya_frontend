import type { PaymentSettlementHistory } from '$lib/api/finance-types';
import type { StudentBilling } from '$lib/types/school';

export interface BillingHistoryEvent { id: string; kind: string; at: string; amount?: number; reason?: string; actor?: string }
export function billingHistory(charge: StudentBilling, history: PaymentSettlementHistory | null): BillingHistoryEvent[] {
	const events: BillingHistoryEvent[] = [];
	if (charge.createdAt)
		events.push({ id: `assigned:${charge.id}`, kind: 'assigned', at: charge.createdAt, amount: charge.total });
	if (charge.adjustedAt)
		events.push({ id: `adjusted:${charge.id}`, kind: 'adjusted', at: charge.adjustedAt, amount: charge.adjustmentAmount ?? 0, reason: charge.adjustmentReason, actor: charge.adjustedById });
	if (charge.waivedAt)
		events.push({ id: `waived:${charge.id}`, kind: 'waived', at: charge.waivedAt, amount: charge.waiverAmount ?? 0, reason: charge.waiverReason, actor: charge.waivedById });
	if (charge.cancelledAt)
		events.push({ id: `cancelled:${charge.id}`, kind: 'cancelled', at: charge.cancelledAt, reason: charge.cancellationReason, actor: charge.cancelledById });
	for (const row of history?.allocations ?? []) {
		if (row.chargeId === charge.id)
			events.push({ id: row.id, kind: row.kind === 'reverse' ? 'allocationReversed' : 'allocated', at: row.recordedAt, amount: row.amount });
	}
	return events.sort((a, b) => (Date.parse(b.at) - Date.parse(a.at)) || a.id.localeCompare(b.id));
}
