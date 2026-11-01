<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { lang, t } from '$lib/i18n';
	import { HeartHandshake } from '$lib/icons';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';
	import { getTeacherFamilyFeedbackTabState } from '../teacher-family-feedback-tab.svelte';

	const { teacher }: { teacher: Teacher } = $props();
	const teachersPage = getTeachersPageState();
	const feedbackTab = getTeacherFamilyFeedbackTabState();
	const campaigns = $derived(feedbackTab.campaignsFor(teacher.id));

	function classLabel(classGroupId: string): string {
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function formatDate(value: string | undefined): string {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString($lang, { day: 'numeric', month: 'short' });
	}
</script>

<div class="space-y-3">
	{#if campaigns.length === 0}
		<DrawerEmptyState label={$t('teacher.familyFeedbackEmpty')}>
			{#snippet icon()}
				<HeartHandshake class="h-5 w-5 text-muted-foreground" />
			{/snippet}
		</DrawerEmptyState>
	{:else}
		<ul class="divide-y divide-border/60 overflow-hidden rounded-collection border border-border bg-card">
			{#each campaigns as campaign (campaign.id)}
				<li>
					<a
						href={detailHref.schoolFamilyFeedback(campaign.id)}
						class="flex items-start justify-between gap-3 px-4 py-3 hover:bg-secondary/40"
					>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">
								{classLabel(campaign.classGroupId)}
								· {teachersPage.subjectLabel(campaign.classSubjectId) || campaign.classSubjectId}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								{formatDate(campaign.opensAt ?? campaign.openedAt)}
								– {formatDate(campaign.closesAt ?? campaign.closedAt)}
							</p>
						</div>
						<span class="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
							{$t(`familyFeedback.status.${campaign.status}`)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
