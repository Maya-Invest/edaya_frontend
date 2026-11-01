<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import { t } from '$lib/i18n';
	import { getFamilyFeedbackPageState } from '../../../family-feedback-page.svelte';

	const familyFeedbackPage = getFamilyFeedbackPageState();
	const campaign = $derived(familyFeedbackPage.selected);
	const live = $derived(campaign ? familyFeedbackPage.findCampaign(campaign.id) ?? campaign : undefined);
	const periodName = $derived(
		live
			? academicContext.periods.find(period => period.id === live.academicPeriodId)?.label ?? live.academicPeriodId
			: '',
	);
	const moderatorName = $derived.by(() => {
		if (!live) {
			return '';
		}
		const name = familyFeedbackPage.staff.find(entry => entry.id === live.moderatorStaffId)?.name;
		return name ?? $t('familyFeedback.noModerator');
	});
	const fieldClass = 'min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm';
</script>

{#if live}
	<div class="space-y-4">
		<p class="text-sm text-muted-foreground">{$t('familyFeedback.confidentiality')}</p>
		<DrawerField label={$t('familyFeedback.assignmentLabel')}>
			<div class={fieldClass}>{familyFeedbackPage.campaignTitle(live)}</div>
		</DrawerField>
		<DrawerField label={$t('familyFeedback.periodLabel')}>
			<div class={fieldClass}>{periodName}</div>
		</DrawerField>
		<DrawerField label={$t('familyFeedback.moderator')}>
			<div class={fieldClass}>{moderatorName}</div>
		</DrawerField>
	</div>
{/if}
