<script lang="ts">
	import type { FamilyFeedbackCampaignStatus } from '$lib/api/family-feedback-types';
	import type { CampaignHistoryRow } from '../lib/family-feedback-history.svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION } from '$lib/family-feedback/permissions';
	import { FAMILY_FEEDBACK_STATUS_TONE } from '$lib/family-feedback/status';
	import { t } from '$lib/i18n';
	import { HeartHandshake, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { getFamilyFeedbackPageState } from '../family-feedback-page.svelte';
	import FamilyFeedbackFormModal from './FamilyFeedbackFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (campaign: CampaignHistoryRow) => void;
		selectedId?: string;
	} = $props();

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const history = familyFeedbackPage.history;
	const campaigns = $derived(history.current?.items ?? []);

	const statusKeys = ['all', 'draft', 'scheduled', 'open', 'closed', 'published', 'archived', 'cancelled'] as const;

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	function fmtDate(value: string | null) {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}

	function statusLabel(value: FamilyFeedbackCampaignStatus) {
		return $t(`familyFeedback.status.${value}`);
	}

	const periodLabels = $derived(new Map(academicContext.periods.map(period => [period.id, period.label])));
	function periodLabel(campaign: CampaignHistoryRow) {
		return periodLabels.get(campaign.academicPeriodId) ?? campaign.academicPeriodId;
	}

	function handleCreated(campaignId: string) {
		const path = detailHref.schoolFamilyFeedback(campaignId);
		openDetailDrawer(`${path}${detailNavigationSearch($page.url)}`, currentRouteSurfaceHref($page.url));
	}

	$effect(() => {
		if (!familyFeedbackPage.filters.ready) {
			return;
		}
		void familyFeedbackPage.filters.values.status;
		familyFeedbackPage.filters.scheduleSync();
	});

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: key === 'all' ? $t('filter.all') : statusLabel(key),
		})),
	);
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[familyFeedbackPage.filters.values.status].filter(value => value !== 'all').length}
		onResetFilters={() => familyFeedbackPage.filters.patchImmediate({ status: 'all' })}
		eyebrow={$t('familyFeedback.eyebrow')}
		title={$t('familyFeedback.count', { n: history.current?.total ?? 0 })}
	>
		{#snippet search()}
			<ListSearchField onCommit={() => familyFeedbackPage.filters.syncNow()}
				bind:value={familyFeedbackPage.filters.values.q}
				oninput={() => familyFeedbackPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={familyFeedbackPage.filters.values.status}
				class="h-9 w-44 rounded-full text-xs"
				options={statusFilterOptions}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission={FAMILY_FEEDBACK_CAMPAIGN_MANAGE_PERMISSION}
				mode="disable"
				tooltip={$t('familyFeedback.permissionManage')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"

						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('familyFeedback.new')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'family-feedback.csv',
					headers: ['title', 'period', 'status', 'closesAt'],
					loadAll: async () => (await history.export(familyFeedbackPage.filters.values)).map(campaign => [
						campaign.title,
						periodLabel(campaign),
						campaign.status,
						campaign.closesAt ?? '',
					]),
				}).catch(() => toast.error($t('dataState.errorDescription')))}
			/>
		{/snippet}
	</ListPageHeader>

	<FamilyFeedbackFormModal bind:open={createOpen.open} onCreated={handleCreated} />

	<div class="overflow-hidden rounded-collection border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-[1.8fr_1fr_1fr_0.9fr] gap-4 border-b border-border bg-secondary/40 px-4 py-2.5 font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground"
		>
			<span>{$t('familyFeedback.assignmentLabel')}</span>
			<span>{$t('familyFeedback.periodLabel')}</span>
			<span>{$t('familyFeedback.statusLabel')}</span>
			<span class="text-right">{$t('familyFeedback.closesAtLabel')}</span>
		</div>
		<InfiniteList
			hasMore={Boolean(history.current?.nextCursor) && !history.failed}
			loading={history.loadingMore}
			total={history.current?.total ?? 0}
			visibleCount={campaigns.length}
			onLoadMore={() => void history.more()}
		>
			<ul class="divide-y divide-border">
				{#each campaigns as campaign (campaign.id)}
					{@const isSelected = campaign.id === selectedId}
					<li>
						<button
							type="button"
							data-campaign-id={campaign.id}
							onclick={() => onSelect?.(campaign)}
							class={cn(
								'grid w-full grid-cols-[1.8fr_1fr_1fr_0.9fr] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-secondary',
								isSelected && 'bg-primary/10',
							)}
						>
							<div class="min-w-0">
								<p class="truncate font-display text-sm font-semibold">{campaign.title}</p>
								<p class="line-clamp-1 text-xs text-muted-foreground">{$t('familyFeedback.confidentiality')}</p>
							</div>
							<span class="text-xs text-foreground/80">{periodLabel(campaign)}</span>
							<span
								class={cn(
									'inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
									FAMILY_FEEDBACK_STATUS_TONE[campaign.status],
								)}
							>
								{statusLabel(campaign.status)}
							</span>
							<div class="flex items-center justify-end gap-1.5 text-xs text-foreground/80">
								<HeartHandshake class="h-3.5 w-3.5 text-muted-foreground" />
								<span class="font-sans tabular-nums">
									{fmtDate(campaign.closesAt ?? campaign.opensAt)}
								</span>
							</div>
						</button>
					</li>
				{/each}
				{#if campaigns.length === 0 && !history.failed}
					<li class="px-4 py-12 text-center text-sm text-muted-foreground">
						{$t('familyFeedback.none')}
					</li>
				{/if}
			</ul>
		</InfiniteList>
		{#if history.failed}
			<Button variant="outline" onclick={() => history.failed === 'more' ? history.more() : history.refresh().catch(() => {})}>{$t('dataState.retry')}</Button>
		{/if}
	</div>
</div>
