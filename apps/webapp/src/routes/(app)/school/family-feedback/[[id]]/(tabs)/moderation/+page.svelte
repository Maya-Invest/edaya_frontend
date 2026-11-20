<script lang="ts">
	import { FAMILY_FEEDBACK_MODERATE_PERMISSION } from '$lib/family-feedback/permissions';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { getFamilyFeedbackPageState } from '../../../family-feedback-page.svelte';

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	const live = $derived(campaign ? familyFeedbackPage.findCampaign(campaign.id) ?? campaign : undefined);
	const canModerate = $derived(hasPermission(FAMILY_FEEDBACK_MODERATE_PERMISSION));

	$effect(() => {
		const campaignId = live?.id;
		if (!campaignId || !canModerate) {
			return;
		}
		void familyFeedbackPage.loadComments(campaignId);
	});
</script>

{#if live}
	{#if canModerate}
		<div class="rounded-collection border border-border bg-card">
			<div class="border-b border-border px-4 py-2.5 font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('familyFeedback.comments')}
			</div>
			{#if familyFeedbackPage.comments.length === 0}
				<p class="px-4 py-6 text-center text-sm text-muted-foreground">{$t('familyFeedback.noComments')}</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each familyFeedbackPage.comments as comment (comment.id)}
						<li class="px-4 py-3 text-sm whitespace-pre-wrap">{comment.comment}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">{$t('familyFeedback.permissionModerate')}</p>
	{/if}
{/if}
