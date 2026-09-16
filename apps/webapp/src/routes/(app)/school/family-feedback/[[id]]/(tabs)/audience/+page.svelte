<script lang="ts">
	import type { FamilyFeedbackAudiencePreview } from '$lib/api/family-feedback-types';
	import { t } from '$lib/i18n';
	import { previewAudienceOnPage } from '../../../lib/family-feedback-detail-mutations';
	import { getFamilyFeedbackPageState } from '../../../family-feedback-page.svelte';

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	const live = $derived(campaign ? familyFeedbackPage.findCampaign(campaign.id) ?? campaign : undefined);
	let preview = $state<FamilyFeedbackAudiencePreview | null>(null);
	let previewCampaignId = $state<string | undefined>(undefined);

	$effect(() => {
		const current = live;
		if (!current) {
			preview = null;
			previewCampaignId = undefined;
			return;
		}
		const campaignId = current.id;
		let cancelled = false;
		previewCampaignId = campaignId;
		void previewAudienceOnPage({
			id: campaignId,
			academicYearId: current.academicYearId,
			academicPeriodId: current.academicPeriodId,
			teacherAssignmentId: current.teacherAssignmentId,
		}).then((result) => {
			if (!cancelled && previewCampaignId === campaignId) {
				preview = result;
			}
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if live}
	<div class="rounded-2xl border border-border bg-card p-4 space-y-2">
		<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
			{$t('familyFeedback.audience')}
		</p>
		{#if preview}
			<p class="text-sm">{$t('familyFeedback.eligible', { n: preview.eligibleCount })}</p>
			<p class="text-sm">{$t('familyFeedback.completed', { n: preview.completedCount })}</p>
			{#if preview.blockers.length > 0}
				<p class="text-xs text-muted-foreground">{$t('familyFeedback.blockers')}: {preview.blockers.join(', ')}</p>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">{$t('familyFeedback.audience')}</p>
		{/if}
	</div>
{/if}
