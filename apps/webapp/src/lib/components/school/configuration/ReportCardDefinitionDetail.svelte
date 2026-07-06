<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteReportCardDefinitionMutation } from '$lib/api/mutations/delete-entity.mutations';
	import { publishReportCardDefinitionMutation } from '$lib/api/mutations/report-cards.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import ReportCardSectionTree from './ReportCardSectionTree.svelte';

	const { definition }: { definition: ReportCardDefinition } = $props();

	const live = $derived(
		reportCardsContext.definitions.find(d => d.id === definition.id) ?? definition,
	);
	const level = $derived(academicContext.gradeLevelById(live.gradeLevelId));
	const scale = $derived(reportCardsContext.scales.find(s => s.id === live.gradeScaleId));

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteReportCardDefinitionMutation(live.id, {
				successMessage: get(t)('reportCards.toastModelDeleted', { name: live.name }),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}

	async function publish() {
		const ok = await publishReportCardDefinitionMutation(live.id);
		if (ok) {
			const updated = reportCardsContext.definitions.find(entry => entry.id === live.id);
			toast.success(get(t)('reportCards.toastModelPublished', { name: updated?.name ?? live.name }));
		}
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={live.name}
		summary="{level?.name ?? '—'} · {scale?.name ?? '—'}"
	>
		{#snippet chips()}
			<span
				class={cn(
					'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
					live.status === 'published'
						? 'bg-accent/15 text-accent-foreground'
						: 'bg-secondary text-muted-foreground',
				)}
			>
				{live.status === 'published' ? $t('academic.published') : $t('academic.draft')}
			</span>
		{/snippet}
		{#snippet actions()}
			{#if live.status === 'draft'}
				<Button size="sm" class="rounded-full" onclick={publish}>
					{$t('reportCards.publishModel')}
				</Button>
			{/if}
		{/snippet}
		{#snippet overflow()}
			{#if live.status === 'draft'}
				<PermissionGate permission="REPORT_CARD_CONFIGURE">
					{#snippet children({ disabled, title })}
						<RowActionMenuItem
							destructive
							{disabled}
							{title}
							onclick={() => (deleteOpen = true)}
						>
							{$t('common.delete')}
						</RowActionMenuItem>
					{/snippet}
				</PermissionGate>
			{/if}
		{/snippet}
	</DrawerEntityHeader>

	<div>
		<div class="mb-3 flex items-end justify-between gap-3">
			<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				{$t('reportCards.sections')}
			</p>
			<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				{$t('reportCards.coefficient')}
			</p>
		</div>
		<div class="overflow-hidden rounded-2xl border border-border p-3">
			<ReportCardSectionTree sections={live.sections} />
		</div>
	</div>

	{#if scale}
		<div class="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
			<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
				{$t('reportCards.gradeScaleSummary')}
			</p>
			<p class="mt-1 font-display text-sm font-semibold">{scale.name}</p>
			<p class="mt-1 text-sm text-muted-foreground">
				{$t('gradeScales.passing')} : {formatGrade(scale.passingScore, scale)} / {scale.maxScore}
			</p>
			{#if scale.description}
				<p class="mt-2 text-xs text-muted-foreground">{scale.description}</p>
			{/if}
		</div>
	{/if}
</div>

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('reportCards.deleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
