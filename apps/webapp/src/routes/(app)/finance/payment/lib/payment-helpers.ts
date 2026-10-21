import type { FinancePayment, StudentYearAccountView } from '$lib/api/finance-data';
import type { Student } from '$lib/types/school';
import { formatLocaleDate } from '$lib/date/format';

export interface PaymentPageSlice {
	total?: number;
	payments: FinancePayment[];
	students: Student[];
	accounts: StudentYearAccountView[];
}

export const PAYMENT_CIVIL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	year: '2-digit',
};

export function formatPaymentCivilDate(paymentDate: string, locale: string): string {
	return formatLocaleDate(paymentDate, locale, PAYMENT_CIVIL_DATE_FORMAT);
}

export function collectedTotalsByCurrency(
	payments: readonly Pick<FinancePayment, 'status' | 'kind' | 'amount' | 'currency'>[],
): { currency: string; amount: number }[] {
	const totals = new Map<string, number>();
	for (const payment of payments) {
		if (payment.status !== 'recorded' || payment.kind !== 'receipt') {
			continue;
		}
		const currency = payment.currency.trim().toUpperCase();
		if (!currency)
			throw new Error('A payment is missing its currency');
		totals.set(currency, (totals.get(currency) ?? 0) + payment.amount);
	}
	return [...totals.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([currency, amount]) => ({ currency, amount }));
}

export function emptyPaymentSlice(): PaymentPageSlice {
	return {
		payments: [],
		students: [],
		accounts: [],
	};
}
