<script lang="ts">
	import type { components } from '$lib/api/schema';
	import { academicContext } from '$lib/academic/context.svelte';
	import { formatPermissionLabel } from '$lib/api/staff-permission-assignments-data';
	import { t } from '$lib/i18n';
	import { PermissionResolutionPreviewState } from '$lib/school/permission-resolution-preview-state.svelte';

	const { report }: { report: components['schemas']['PermissionResolutionReport'] } = $props();
	const preview = new PermissionResolutionPreviewState();
	$effect(() => {
		void preview.load(report);
		return () => preview.cancel();
	});
</script>
<div class="space-y-3 rounded-collection border border-border bg-secondary/30 p-4" aria-live="polite">
	<p class="text-sm font-medium">{$t('staff.scopeImpact', {
		added: report.changes.filter(row => row.change === 'added').length,
		changed: report.changes.filter(row => row.change === 'changed').length,
		removed: report.changes.filter(row => row.change === 'removed').length,
	})}</p>
	{#if report.changes.length}
		<ul class="max-h-60 space-y-2 overflow-auto text-xs">
			{#each report.changes as change, index (index)}
				<li>{change.staffName} · {academicContext.years.find(year => year.id === change.academicYearId)?.label ?? change.academicYearId} · {formatPermissionLabel(change.permission, $t)} · {$t(`staff.scopeChange.${change.change}`)}{preview.labels[index] === '' ? '' : ` · ${preview.labels[index] ?? '…'}`}</li>
			{/each}
		</ul>
	{/if}
	{#each report.warnings.filter(row => row.reason !== 'shadowed') as warning, index (index)}
		<p class="text-xs text-highlight">{warning.staffName} · {academicContext.years.find(year => year.id === warning.academicYearId)?.label ?? warning.academicYearId} · {formatPermissionLabel(warning.permission, $t)} — {$t(`staff.scopeWarning.${warning.reason}`)}</p>
	{/each}
</div>
