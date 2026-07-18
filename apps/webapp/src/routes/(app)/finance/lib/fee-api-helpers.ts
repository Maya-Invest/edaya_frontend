import type { components } from '$lib/api/schema';
import type { Fee } from '$lib/types/school';

type ApiFee = components['schemas']['Fee'];
type ApiFeeCategory = 'tuition' | 'uniform' | 'transport' | 'other';

export const UI_TO_API_CATEGORY: Record<Fee['category'], ApiFeeCategory> = {
	Tuition: 'tuition',
	Transport: 'transport',
	Materials: 'uniform',
	Meals: 'other',
	Activities: 'other',
};

export function installmentsForPeriod(period: Fee['period']) {
	if (period === 'Year') {
		return [
			{ label: 'T1', percentage: 33.33 },
			{ label: 'T2', percentage: 33.33 },
			{ label: 'T3', percentage: 33.34 },
		];
	}
	if (period === 'Term') {
		return [{ label: 'Term', percentage: 100 }];
	}
	return [];
}

function feeCurrency(existing: Pick<ApiFee, 'currency' | 'defaultAmount'>): string {
	if (typeof existing.currency === 'string' && existing.currency.trim() !== '') {
		return existing.currency;
	}
	if (existing.defaultAmount && typeof existing.defaultAmount === 'object' && 'currency' in existing.defaultAmount) {
		const currency = (existing.defaultAmount as { currency: unknown }).currency;
		if (typeof currency === 'string' && currency.trim() !== '') {
			return currency;
		}
	}
	return 'XOF';
}

export function feeSavePayload(
	existing: ApiFee,
	updates: { name: string; category: ApiFeeCategory; amount: number },
): ApiFee {
	return {
		id: existing.id,
		schoolId: existing.schoolId,
		academicYearId: existing.academicYearId,
		name: updates.name,
		category: updates.category,
		description: existing.description,
		defaultAmount: Math.round(updates.amount),
		currency: feeCurrency(existing),
		installments: existing.installments ?? [],
		createdAt: existing.createdAt,
	};
}
