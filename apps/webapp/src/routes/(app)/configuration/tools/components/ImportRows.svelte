<script lang="ts">
	import type { components } from '$lib/api/schema';
	import Button from '$lib/components/ui/button/button.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { IMPORT_TYPE_DEFINITIONS } from '$lib/import/catalog/import-types';

	const { detail }: { detail: components['schemas']['SchoolImportDetail'] } = $props();
	let pageIndex = $state(0);
	let outcomeFilter = $state('');
	const files = $derived([...new Map(detail.files.map(file => [file.fileId, file])).values()]);
	const rows = $derived(detail.rows.filter(row => !outcomeFilter || row.outcome === outcomeFilter));
	const visiblePageIndex = $derived(Math.min(pageIndex, Math.max(0, Math.ceil(rows.length / 50) - 1)));
	const visibleRows = $derived(rows.slice(visiblePageIndex * 50, (visiblePageIndex + 1) * 50));
	const typeLabel = (type: string) => $t(IMPORT_TYPE_DEFINITIONS.find(item => item.key === type)?.labelKey ?? type);
	const display = (value: unknown) => value === undefined ? $t('durableImport.omitted') : value === null ? $t('durableImport.blank') : typeof value === 'object' ? JSON.stringify(value) : String(value);
</script>

<div class="space-y-4">
	{#if detail.batch.state === 'running'}<p class="text-sm text-muted-foreground" role="status">{$t('durableImport.rowsSnapshot')}</p>{/if}
	<div class="flex flex-wrap gap-2" aria-live="polite">
		{#each Object.entries(detail.counts) as [key, count] (key)}<span class="rounded-full bg-muted px-3 py-1 text-xs">{$t(`durableImport.outcome.${key}`)}: {count}</span>{/each}
	</div>
	<label class="block max-w-xs space-y-1 text-sm"><span>{$t('durableImport.filter')}</span>
		<SelectField class="w-full border border-input bg-background" bind:value={outcomeFilter} onchange={() => { pageIndex = 0; }}><option value="">{$t('durableImport.all')}</option>{#each ['pending', 'created', 'updated', 'unchanged', 'skipped', 'blocked', 'dependency_blocked', 'failed', 'cancelled'] as outcome (outcome)}<option value={outcome}>{$t(`durableImport.outcome.${outcome}`)}</option>{/each}</SelectField>
	</label>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users must be able to scroll the wide data table.) -->
	<div class="overflow-x-auto rounded-collection border" tabindex="0" role="region" aria-label={$t('durableImport.preview')}>
		<table class="ui-entry-table w-full min-w-[800px] text-left text-sm">
			<thead class="bg-muted"><tr><th class="px-4 py-3">{$t('durableImport.source')}</th><th class="px-4 py-3">{$t('durableImport.mode')}</th><th class="px-4 py-3">{$t('durableImport.result')}</th><th class="px-4 py-3">{$t('durableImport.changes')}</th></tr></thead>
			<tbody>{#each visibleRows as row (row.id)}
				<tr class="border-t align-top">
					<td class="px-4 py-3"><span>{files.find(file => file.fileId === row.source.fileId)?.fileName} : {row.source.row}</span><p class="text-xs text-muted-foreground">{typeLabel(row.type)}</p></td>
					<td class="px-4 py-3">{row.effectiveMode}</td>
					<td class="max-w-sm p-3"><span>{$t(`durableImport.outcome.${row.outcome}`)}</span>{#each row.issues as issue, index (`${issue.code}:${index}`)}<p class="mt-1 break-words text-xs text-destructive">{issue.code}{issue.column ? ` (${issue.column})` : ''}{issue.candidates?.length ? `: ${issue.candidates.join(', ')}` : ''}</p>{/each}</td>
					<td class="px-4 py-3"><details><summary class="cursor-pointer">{$t('durableImport.inspect')}</summary><p class="my-2 break-all text-xs">{$t('durableImport.target')}: {row.current ? row.targetId : $t('durableImport.newRecord')}</p>
						<table class="ui-entry-table my-2 w-full text-xs"><thead><tr><th class="p-1">{$t('durableImport.field')}</th><th class="p-1">{$t('durableImport.current')}</th><th class="p-1">{$t('durableImport.resulting')}</th></tr></thead><tbody>{#each [...new Set([...Object.keys(row.current ?? {}), ...Object.keys(row.proposed ?? {})])] as key (key)}<tr class="border-t"><th class="p-1 font-normal">{key}</th><td class="max-w-56 break-words p-1">{display(row.current?.[key])}</td><td class="max-w-56 break-words p-1">{display(row.proposed?.[key])}</td></tr>{/each}</tbody></table>
						<details><summary class="cursor-pointer">{$t('durableImport.imported')}</summary><dl>{#each Object.entries(row.raw) as [key, value] (key)}<dt class="mt-2 text-xs font-semibold">{key}</dt><dd class="max-w-80 break-words text-xs">{display(value)}</dd>{/each}</dl></details>
					</details></td>
				</tr>
			{:else}<tr><td colspan="4" class="p-6 text-center text-muted-foreground">{$t('durableImport.empty')}</td></tr>{/each}</tbody>
		</table>
	</div>
	<div class="flex items-center justify-end gap-3"><Button variant="outline" size="sm" disabled={visiblePageIndex === 0} onclick={() => pageIndex = visiblePageIndex - 1}>{$t('durableImport.previous')}</Button><span class="text-sm">{visiblePageIndex + 1} / {Math.max(1, Math.ceil(rows.length / 50))}</span><Button variant="outline" size="sm" disabled={(visiblePageIndex + 1) * 50 >= rows.length} onclick={() => pageIndex = visiblePageIndex + 1}>{$t('durableImport.next')}</Button></div>
</div>
