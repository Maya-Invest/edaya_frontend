<script lang="ts">
	import type { ReportCardDefinition } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import ReportCardSectionTree from '$lib/components/school/configuration/ReportCardSectionTree.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appPath } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, listSurfaceHref } from '$lib/navigation/route-surface-navigation';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getReportCardsPageState } from '../../report-cards-page.svelte';

	const { definition }: { definition: ReportCardDefinition } = $props();

	const reportCardsPage = getReportCardsPageState();
	const modals = createUrlSyncedModals({
		allowed: ['delete'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const deleteOpen = bindUrlModal(modals, 'delete');

	const live = $derived(reportCardsPage.selectedDefinition(definition.id) ?? definition);
	const level = $derived(academicContext.gradeLevelById(live.gradeLevelId));
	const scale = $derived(reportCardsPage.scales.find(entry => entry.id === live.gradeScaleId));

	let deleteBusy = $state(false);

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await reportCardsPage.deleteDefinition({
				definitionId: live.id,
				successMessage: get(t)('reportCards.toastModelDeleted', { name: live.name }),
				onSuccess: () => {
					closeDetailDrawer(listSurfaceHref(appPath('/(app)/configuration/report-cards/[[id]]'), $page.url));
				},
			});
			if (ok) {
				deleteOpen.open = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}

	async function publish() {
		await reportCardsPage.publishDefinition({
			definitionId: live.id,
			successMessage: get(t)('reportCards.toastModelPublished', { name: live.name }),
		});
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
					'rounded-full px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase',
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
							onclick={() => (deleteOpen.open = true)}
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
			<p class="font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
				{$t('reportCards.sections')}
			</p>
			<p class="font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
				{$t('reportCards.coefficient')}
			</p>
		</div>
		<div class="overflow-hidden rounded-2xl border border-border p-3">
			<ReportCardSectionTree sections={live.sections} />
		</div>
	</div>

	{#if scale}
		<div class="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
			<p class="font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
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
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('reportCards.deleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>
