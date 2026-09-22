<script lang="ts">
	import type { FamilyFeedbackCampaign } from '$lib/api/family-feedback-types';
	import { page } from '$app/stores';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { MODAL_QUERY_KEY, MODAL_TARGET_QUERY_KEY } from '$lib/modal/modal-url';
	import { followDrawerTabLink } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import {
		FAMILY_FEEDBACK_DETAIL_TABS,
		activeFamilyFeedbackDetailTab,
	} from '../../lib/family-feedback-detail-tabs';

	const { campaign }: { campaign: FamilyFeedbackCampaign } = $props();

	const activeTab = $derived(activeFamilyFeedbackDetailTab($page.url.pathname, campaign.id));

	function tabHref(segment: (typeof FAMILY_FEEDBACK_DETAIL_TABS)[number]['segment']) {
		const next = new URL($page.url);
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		const base = detailHref.schoolFamilyFeedbackTab(campaign.id, segment);
		return `${base}${next.search}`;
	}
</script>

<div
	data-testid="drawer-tab-bar"
	class="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary/40 p-1 text-xs"
>
	{#each FAMILY_FEEDBACK_DETAIL_TABS as tab (tab.key)}
		<a
			href={tabHref(tab.segment)}
			data-sveltekit-noscroll
			onclick={event => followDrawerTabLink(event, tabHref(tab.segment))}
			class={cn(
				'whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium transition',
				activeTab === tab.key
					? 'bg-card text-foreground shadow-soft'
					: 'text-muted-foreground hover:text-foreground',
			)}
		>
			{$t(tab.labelKey)}
		</a>
	{/each}
</div>
