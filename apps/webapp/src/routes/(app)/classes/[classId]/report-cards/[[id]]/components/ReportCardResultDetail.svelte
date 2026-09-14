<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { writeHomeroomReportCommentMutation } from '$lib/api/mutations/student-ops.mutations';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getReportCardsPageState } from '../../report-cards-page.svelte';

	const { result }: { result: ReportCardResult } = $props();

	const reportCardsPage = getReportCardsPageState();
	const live = $derived(reportCardsPage.selectedResult(result.classId, result.id) ?? result);
	const student = $derived(reportCardsPage.studentFor(live.studentId));
	const definition = $derived(
		reportCardsPage.definitionsFor(live.classId).find(entry => entry.id === live.definitionId),
	);
	const scale = $derived(
		reportCardsPage.scalesFor(live.classId).find(entry => entry.id === live.gradeScaleId),
	);

	let commentDraft = $derived(live.homeroomComment ?? '');
	let commentBusy = $state(false);

	function resultStatusLabel(status: ReportCardResult['status']) {
		if (status === 'published') {
			return $t('reportCards.statusPublished');
		}
		if (status === 'generated') {
			return $t('reportCards.statusGenerated');
		}
		return $t('reportCards.statusDraft');
	}

	async function publish() {
		await reportCardsPage.publishResult({
			resultId: live.id,
			successMessage: get(t)('reportCards.toastPublished', { name: student?.name ?? '' }),
		});
	}

	async function saveHomeroomComment() {
		commentBusy = true;
		const ok = await writeHomeroomReportCommentMutation({
			resultId: live.id,
			teacherComment: commentDraft,
			successMessage: get(t)('reportCards.homeroomCommentSaved'),
		});
		commentBusy = false;
		if (ok) {
			reportCardsPage.patchResult(live.id, { homeroomComment: commentDraft.trim() });
		}
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={student?.name ?? '—'}
		summary={definition?.name ?? '—'}
	>
		{#snippet chips()}
			<span
				class={cn(
					'rounded-full px-2 py-0.5 font-sans tabular-nums text-[10px] uppercase',
					live.status === 'published'
						? 'bg-accent/15 text-accent-foreground'
						: live.status === 'generated'
						? 'bg-highlight-soft text-highlight'
						: 'bg-secondary text-muted-foreground',
				)}
			>
				{resultStatusLabel(live.status)}
			</span>
		{/snippet}
		{#snippet actions()}
			{#if live.status === 'generated'}
				<Button size="sm" class="rounded-full" onclick={publish}>
					{$t('reportCards.publish')}
				</Button>
			{/if}
		{/snippet}
	</DrawerEntityHeader>

	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{$t('reportCards.overall')}</p>
			<p class="font-display text-2xl font-semibold">
				{scale ? formatGrade(live.overallAverage, scale) : live.overallAverage}
			</p>
		</div>
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{$t('reportCards.rank')}</p>
			<p class="font-display text-2xl font-semibold">{live.classRank}/{live.classSize}</p>
		</div>
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{$t('reportCards.period')}</p>
			<p class="font-display text-lg font-semibold">{live.academicPeriodId}</p>
		</div>
	</div>

	{#each live.sectionResults as section (section.sectionId)}
		{#if section.marks.length > 0}
			<div>
				<p class="mb-2 font-display text-sm font-semibold">
					{definition?.sections.find(entry => entry.id === section.sectionId)?.name ?? 'Section'}
					{#if section.sectionAverage !== undefined}
						<span class="ml-2 font-sans tabular-nums text-xs text-muted-foreground">
							(moy. {scale ? formatGrade(section.sectionAverage, scale) : section.sectionAverage})
						</span>
					{/if}
				</p>
				<ul class="space-y-2">
					{#each section.marks as mark (mark.subjectId)}
						<li class="rounded-xl border border-border/70 bg-background/60 px-4 py-3">
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-medium">{mark.subjectName}</p>
									<p class="text-xs text-muted-foreground">{mark.teacherName}</p>
								</div>
								<p class="font-sans tabular-nums font-semibold">
									{scale ? formatGrade(mark.average, scale) : mark.average}
								</p>
							</div>
							{#if mark.appreciation}
								<p class="mt-2 text-sm text-muted-foreground">{mark.appreciation}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/each}

	<div class="rounded-xl border border-border bg-card p-4 space-y-2">
		<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{$t('reportCards.homeroomComment')}</p>
		<Textarea bind:value={commentDraft} rows={3} />
		<Button size="sm" class="rounded-full" disabled={commentBusy} onclick={() => void saveHomeroomComment()}>
			{$t('reportCards.saveHomeroomComment')}
		</Button>
	</div>

	{#if live.principalComment}
		<div class="rounded-xl border border-border bg-card p-4">
			<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{$t('reportCards.principalComment')}</p>
			<p class="mt-1 text-sm">{live.principalComment}</p>
		</div>
	{/if}
</div>
