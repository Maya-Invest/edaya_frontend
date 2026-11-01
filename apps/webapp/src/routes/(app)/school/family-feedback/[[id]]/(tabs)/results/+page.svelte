<script lang="ts">
	import { t } from '$lib/i18n';
	import { getFamilyFeedbackPageState } from '../../../family-feedback-page.svelte';

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	const live = $derived(campaign ? familyFeedbackPage.findCampaign(campaign.id) ?? campaign : undefined);

	$effect(() => {
		const campaignId = live?.id;
		if (!campaignId) {
			return;
		}
		void familyFeedbackPage.loadAggregates(campaignId);
	});
</script>

{#if live}
	{#if familyFeedbackPage.aggregate && familyFeedbackPage.reviewCampaignId === live.id}
		<div class="rounded-collection border border-border bg-card p-4 space-y-3">
			<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.aggregates')}
			</p>
			<p class="text-sm">{$t('familyFeedback.responseRate')}: {Math.round(familyFeedbackPage.aggregate.responseRate * 100)}%</p>
			{#if familyFeedbackPage.aggregate.overallSuppressed}
				<p class="text-sm text-muted-foreground">{$t('familyFeedback.overallSuppressed')}</p>
			{/if}
			<ul class="space-y-2">
				{#each familyFeedbackPage.aggregate.questions as question (question.questionId)}
					<li class="rounded-collection bg-secondary/40 px-3 py-2 text-sm">
						<p class="font-medium">{$t(`familyFeedback.question.${question.questionId}`)}</p>
						{#if question.suppressed}
							<p class="text-muted-foreground">{$t('familyFeedback.suppressed')}</p>
						{:else}
							<p>{$t('familyFeedback.nScored', { n: question.nScored })} · 1–5: {question.distribution[1]}/{question.distribution[2]}/{question.distribution[3]}/{question.distribution[4]}/{question.distribution[5]}</p>
						{/if}
						<p class="text-xs text-muted-foreground">{$t('familyFeedback.cannotAssess')}: {question.nCannotAssess}</p>
					</li>
				{/each}
			</ul>
			{#if familyFeedbackPage.aggregate.themes}
				<p class="whitespace-pre-wrap text-sm">{familyFeedbackPage.aggregate.themes}</p>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">{$t('familyFeedback.aggregates')}</p>
	{/if}
{/if}
