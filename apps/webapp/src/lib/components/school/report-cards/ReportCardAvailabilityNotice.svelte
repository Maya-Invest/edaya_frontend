<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { t } from '$lib/i18n';
	import { reportCardAvailability } from '$lib/types/report-cards';

	const { results }: { results: readonly ReportCardResult[] } = $props();
	const availability = $derived(results.map(reportCardAvailability));
	const missingValues = $derived(availability.some(result => result.missingValues));
	const missingGrading = $derived(availability.some(result => result.missingGrading));
</script>

{#if missingValues || missingGrading}
	<div role="status" data-testid="report-card-availability-notice" class="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
		{#if missingValues}<p>{$t('reportCards.missingValuesNotice')}</p>{/if}
		{#if missingGrading}<p>{$t('reportCards.missingGradingNotice')}</p>{/if}
	</div>
{/if}
