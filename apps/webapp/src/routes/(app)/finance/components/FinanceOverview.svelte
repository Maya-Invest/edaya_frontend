<script lang="ts">
	import type { FinanceOverview } from '$lib/api/finance-types';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';

	const { overview, fee = false }: { overview: FinanceOverview; fee?: boolean } = $props();
	const metrics = $derived([
		['finance.netBilled', overview.netBilled],
		['finance.applied', overview.applied],
		['finance.outstanding', overview.outstanding],
		['finance.overdue', overview.overdue],
	] as const);
</script>
<section aria-label={$t('finance.overview')} class="space-y-2">
	<div class={fee ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4'}>
		{#each metrics as [label, value] (label)}
			<div class="min-w-0 rounded-collection border border-border bg-card p-5 shadow-soft">
				<div class="flex min-h-7 flex-wrap items-center justify-between gap-2">
					<p class="text-xs uppercase tracking-wider text-muted-foreground">{$t(label)}</p>
					{#if label === 'finance.netBilled'}
						<span class="ml-auto rounded-full bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">{$t(overview.studentsAssigned === 1 ? 'finance.studentAssigned' : 'finance.studentsAssigned', { n: overview.studentsAssigned })}</span>
					{:else if label === 'finance.overdue'}
						<span class="ml-auto rounded-full bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">{$t(overview.overdueStudents === 1 ? 'finance.overdueStudent' : 'finance.overdueStudents', { n: overview.overdueStudents })}</span>
					{/if}
				</div>
				<p class:text-destructive={label === 'finance.overdue'} class={fee ? 'mt-2 break-words font-sans text-2xl font-semibold tabular-nums' : 'mt-2 break-words font-sans text-xl font-semibold tabular-nums 2xl:text-2xl'}>{formatMinorUnits(value, overview.currency, $locale)}</p>
			</div>
		{/each}
	</div>
</section>
