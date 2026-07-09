import type { components } from '$lib/api/schema';
import type { Fee } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

type ApiFee = components['schemas']['Fee'];
type ApiFeeCategory = 'tuition' | 'uniform' | 'transport' | 'other';

const UI_TO_API_CATEGORY: Record<Fee['category'], ApiFeeCategory> = {
	Tuition: 'tuition',
	Transport: 'transport',
	Materials: 'uniform',
	Meals: 'other',
	Activities: 'other',
};

function installmentsForPeriod(period: Fee['period']) {
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

function feeSavePayload(
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

function feeSnapshot(feeId: string): Fee | undefined {
	return detailDataContext.fees.find(fee => fee.id === feeId);
}

export async function createFeeMutation(input: {
	name: string;
	category: Fee['category'];
	amount: number;
	period: Fee['period'];
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		toast.error(get(t)('fee.noContext'));
		return null;
	}

	const id = `fee-${Date.now().toString(36)}`;
	const optimistic: Fee = {
		id,
		name: input.name.trim(),
		category: input.category,
		amount: input.amount,
		period: input.period,
	};

	const result = await runMutation(() => client.commands.createFee({
		id,
		schoolId,
		academicYearId,
		name: input.name.trim(),
		category: UI_TO_API_CATEGORY[input.category],
		defaultAmount: input.amount,
		currency: 'XOF',
		installments: installmentsForPeriod(input.period),
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendFee(optimistic);
		},
		rollback: () => {
			detailDataContext.removeFee(id);
		},
	});
	return result ? id : null;
}

export async function updateFeeMutation(input: {
	feeId: string;
	name: string;
	category: Fee['category'];
	amount: number;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = feeSnapshot(input.feeId);
	const patch = {
		name: input.name.trim(),
		category: input.category,
		amount: input.amount,
	};

	const result = await runMutation(async () => {
		const existing = await client.entities.fees.get(input.feeId);
		return client.entities.fees.save(feeSavePayload(existing, {
			name: input.name.trim(),
			category: UI_TO_API_CATEGORY[input.category],
			amount: input.amount,
		}));
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchFee(input.feeId, patch);
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchFee(input.feeId, previous);
			}
		},
	});
	return result !== null;
}
