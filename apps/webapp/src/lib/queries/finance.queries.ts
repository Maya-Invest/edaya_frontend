import { academicContext } from '$lib/academic/context.svelte';
import { loadFinanceData } from '$lib/api/finance-data';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { queryClient } from '$lib/queries/client';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

async function seedFinancePageData() {
	const { fees, billing, students } = await loadFinanceData(queryClient(), {
		schoolId: academicContext.schools[0]?.id ?? '',
		academicYearId: academicContext.yearId,
	});
	detailDataContext.seedFees(fees);
	detailDataContext.seedBilling(billing);
	detailDataContext.seedStudents(students);
}

export function queryFinancePage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			await seedFinancePageData();
			return {};
		},
		hasItems: listPageHasItems,
	});
}

export function queryPaymentsPage() {
	return (url: URL) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async () => {
			await seedFinancePageData();
			return {};
		},
		hasItems: listPageHasItems,
	});
}
