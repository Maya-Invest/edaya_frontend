<script lang="ts">
	import { page } from '$app/stores';
	import { lookupGradeInterval, roundedSample } from '$lib/api/grade-intervals';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, Pencil, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { hasAnyPermission } from '$lib/permissions';
	import { getGradeScalesPageState } from '../grade-scales-page.svelte';
	import GradeIntervalFormModal from './GradeIntervalFormModal.svelte';
	import GradeScaleFormModal from './GradeScaleFormModal.svelte';

	const owner = getGradeScalesPageState();
	const modals = createUrlSyncedModals({ allowed: ['create', 'edit', 'delete', 'add-interval', 'edit-interval', 'delete-interval'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');
	const addInterval = bindUrlModal(modals, 'add-interval');
	const editInterval = bindUrlModal(modals, 'edit-interval');
	const deleteInterval = bindUrlModal(modals, 'delete-interval');
	const target = $derived(owner.scaleFor(modals.target?.split('/')[0] ?? ''));
	const interval = $derived(target?.ranges?.find(row => row.id === modals.target?.split('/')[1]));
	const scales = $derived(owner.scales.filter(scale => `${scale.name} ${scale.description ?? ''}`.toLocaleLowerCase().includes(owner.filters.values.q.trim().toLocaleLowerCase())));
	const expanded = $derived($page.url.searchParams.get('scale') ?? scales[0]?.id);
	const samples = $state<Record<string, string>>({});
	let busy = $state(false);
	let confirmationRevision = 0;
	let confirmationKey = '';
	$effect(() => {
		const key = `${modals.active}:${modals.target}`;
		if (key !== confirmationKey) {
			confirmationKey = key;
			confirmationRevision = target?.revision ?? 0;
		}
	});
	$effect(() => {
		if (owner.filters.ready) {
			void owner.filters.values.q;
			owner.filters.scheduleSync();
		}
	});
	async function toggle(id: string) {
		const url = new URL($page.url);
		url.searchParams.set('scale', expanded === id ? 'none' : id);
		await appGoto(`${url.pathname}${url.search}`, { keepFocus: true, noScroll: true });
	}
	async function confirm(action: 'delete' | 'remove-interval') {
		if (!target || busy || !hasAnyPermission(['REPORT_CARD_CONFIGURE']) || (action === 'delete' && target.isDefault))
			return;
		busy = true;
		try {
			const ok = await owner.configureScale({ id: target.id, expectedRevision: confirmationRevision, action, intervalId: interval?.id });
			if (ok)
				modals.close();
		}
		finally {
			busy = false;
		}
	}
</script>
<div class="animate-fade-in space-y-6">
	<ListPageHeader eyebrow={$t('gradeScales.subtitle')} title={$t('gradeScales.title', { n: scales.length })}>
		{#snippet search()}<ListSearchField bind:value={owner.filters.values.q} oninput={() => owner.filters.scheduleSync()} />{/snippet}
		{#snippet primary()}<PermissionGate permission="REPORT_CARD_CONFIGURE">{#snippet children({ disabled, title })}<Button {disabled} {title} onclick={() => modals.open('create')}><Plus class="mr-2 h-4 w-4" />{$t('gradeScales.add')}</Button>{/snippet}</PermissionGate>{/snippet}
		{#snippet more()}<ListMoreMenu exportOnly onExport={() => void exportMatchingList({ filename: 'grade-scales.csv', headers: ['name', 'minScore', 'maxScore', 'intervals', 'default'], loadAll: async () => scales.map(scale => [scale.name, scale.minScore, scale.maxScore, scale.ranges?.length ?? 0, scale.isDefault ? 'default' : '']) })} />{/snippet}
	</ListPageHeader>
	{#if !scales.length}<p class="py-8 text-sm text-muted-foreground">{$t('dataState.emptyDescription')}</p>{/if}
	{#each scales as scale (scale.id)}
		<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			<div class="flex items-center gap-2 p-4">
				<button type="button" class="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-expanded={expanded === scale.id} aria-controls={`intervals-${scale.id}`} onclick={() => toggle(scale.id)}>
					<ChevronDown class={`h-5 w-5 shrink-0 transition-transform ${expanded === scale.id ? 'rotate-180' : ''}`} />
					<div class="min-w-0"><h2 class="break-words font-display text-base font-semibold">{scale.name}</h2><p class="text-sm text-muted-foreground">{scale.minScore} → {scale.maxScore} · {$t('grading.intervalCount', { n: scale.ranges?.length ?? 0 })}{scale.isDefault ? ` · ${$t('gradeScales.default')}` : ''}{!scale.ranges?.length ? ` · ${$t('grading.incomplete')}` : ''}</p></div>
				</button>
				<PermissionGate permission="REPORT_CARD_CONFIGURE">{#snippet children({ disabled, title })}<RowActionMenu><RowActionMenuItem {disabled} {title} onclick={() => modals.open('edit', { target: scale.id })}>{$t('common.edit')}</RowActionMenuItem>{#if !scale.isDefault}<RowActionMenuItem destructive {disabled} {title} onclick={() => modals.open('delete', { target: scale.id })}>{$t('common.delete')}</RowActionMenuItem>{/if}</RowActionMenu>{/snippet}</PermissionGate>
			</div>
			{#if expanded === scale.id}
				{@const value = samples[scale.id]}
				{@const rounded = roundedSample(Number(value), scale.decimalPlaces, scale.roundingMode ?? 'nearest')}
				{@const match = value?.trim() && Number(value) >= scale.minScore && Number(value) <= scale.maxScore ? lookupGradeInterval(scale.ranges ?? [], rounded, scale.intervalConvention === 'continuous') : undefined}
				<div id={`intervals-${scale.id}`} class="space-y-4 border-t border-border p-5">
					{#if scale.description}<p class="text-sm text-muted-foreground">{scale.description}</p>{/if}
					<div class="flex flex-wrap items-center justify-between gap-3"><h3 class="font-medium">{$t('grading.intervals')}</h3><PermissionGate permission="REPORT_CARD_CONFIGURE">{#snippet children({ disabled, title })}<Button size="sm" variant="outline" {disabled} {title} onclick={() => modals.open('add-interval', { target: scale.id })}>{$t('grading.addInterval')}</Button>{/snippet}</PermissionGate></div>
					<p class="text-sm text-muted-foreground">{$t('grading.thresholdHelp')}</p>
					{#if !scale.ranges?.length}<p role="status" class="rounded-lg bg-secondary p-3 text-sm">{$t('grading.emptyHelp')}</p>{/if}
					<ul class="space-y-2">
						{#each scale.ranges ?? [] as row, index (row.id ?? index)}
							<li class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
								<div class="min-w-0 flex-1 basis-56"><p class="break-words text-sm font-medium">{row.letter} · {row.interpretation ?? row.letter}</p><p class="text-sm tabular-nums text-muted-foreground">{$t('grading.minimum')}: {row.minScore}{row.gpaValue != null ? ` · ${$t('grading.points')}: ${row.gpaValue}` : ''} · {row.isPassing ? $t('grading.passing') : $t('grading.failing')}</p></div>
								<PermissionGate permission="REPORT_CARD_CONFIGURE">{#snippet children({ disabled, title })}
									<div class="ml-auto flex shrink-0 items-center gap-2">
										<Button size="sm" variant="outline" {disabled} {title} aria-label={`${$t('common.edit')} ${row.letter}`} onclick={() => modals.open('edit-interval', { target: `${scale.id}/${row.id}` })}><Pencil class="mr-2 h-4 w-4" />{$t('common.edit')}</Button>
										<RowActionMenu><RowActionMenuItem destructive disabled={disabled || (index === 0 && ((scale.ranges?.length ?? 0) > 1 || !!scale.isDefault))} onclick={() => modals.open('delete-interval', { target: `${scale.id}/${row.id}` })}>{$t('common.delete')}</RowActionMenuItem></RowActionMenu>
									</div>
								{/snippet}</PermissionGate>
							</li>
						{/each}
					</ul>

					<div class="flex flex-wrap items-end gap-x-4 gap-y-2">
						<label class="block w-40 max-w-full space-y-1.5 text-sm"><span>{$t('grading.sample')}</span><Input type="number" step="any" bind:value={() => samples[scale.id] ?? '', value => samples[scale.id] = value} /></label>
						<p class="min-w-0 basis-40 flex-1 break-words py-2 text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">{value ? match ? `${match.letter} · ${match.interpretation ?? ''}` : $t('grading.noMatch') : ''}</p>
					</div>
				</div>
			{/if}
		</section>
	{/each}
</div>
<GradeScaleFormModal bind:open={createOpen.open} />
{#if target}
	<GradeScaleFormModal bind:open={editOpen.open} scale={target} />
	<GradeIntervalFormModal bind:open={addInterval.open} scale={target} />
	{#if interval}<GradeIntervalFormModal bind:open={editInterval.open} scale={target} {interval} />{/if}
	{#if !target.isDefault}<ConfirmModal bind:open={deleteOpen.open} title={$t('common.deleteConfirmTitle')} description={$t('gradeScales.deleteConfirm', { name: target.name })} {busy} onConfirm={() => confirm('delete')} />{/if}
	{#if interval}<ConfirmModal bind:open={deleteInterval.open} title={$t('common.deleteConfirmTitle')} description={$t('grading.deleteIntervalHelp', { name: interval.letter })} {busy} onConfirm={() => confirm('remove-interval')} />{/if}
{/if}
