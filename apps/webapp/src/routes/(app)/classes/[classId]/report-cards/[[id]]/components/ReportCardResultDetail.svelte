<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import ReportSectionComments from '$lib/components/school/report-cards/ReportSectionComments.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { formatGrade, formatCalculatedGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import ReportHomeroomComment from '../../components/ReportHomeroomComment.svelte';
	import { getReportCardsPageState } from '../../report-cards-page.svelte';

	const { result }: {
		result: ReportCardResult;
	} = $props();
	const reportCardsPage = getReportCardsPageState();
	const stored = $derived(reportCardsPage.selectedResult(result.classId, result.id) ?? result);
	const live = $derived(stored.revisedDraft ?? stored);
	const student = $derived(reportCardsPage.studentFor(live.studentId));
	const definition = $derived(reportCardsPage.definitionsFor(live.classId).find(entry => entry.id === live.definitionId));
	const scale = $derived(reportCardsPage.scalesFor(live.classId).find(entry => entry.id === live.gradeScaleId));
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
			reviewedRevision: !!stored.revisedDraft,
			successMessage: get(t)('reportCards.toastPublished', { name: student?.name ?? '' }),
		});
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
				<Button size="sm" class="rounded-full" disabled={Boolean(live.calculationStale || live.pendingAssessmentIds?.length || live.pendingCorrectionIds?.length)} onclick={publish}>
					{$t('reportCards.publish')}
				</Button>
			{/if}
		{/snippet}
	</DrawerEntityHeader>

	{#if stored.revisedDraft}<div role="status" class="rounded-xl border border-border bg-secondary p-3"><p class="font-semibold">{$t('grading.revisedDraft')}</p><p class="text-sm">{$t('grading.publishedPreserved')}</p></div>{/if}
	{#if live.calculationStale}
		<p role="status">{$t('reportCards.staleMarks')}</p>
	{/if}
	{#if live.pendingAssessmentIds?.length}
		<p role="status">{$t('reportCards.pendingSubmissions', { count: String(live.pendingAssessmentIds.length) })}</p>
	{/if}
	{#if live.pendingCorrectionIds?.length}
		<p role="status">{$t('reportCards.pendingCorrections', { count: String(live.pendingCorrectionIds.length) })} <PermissionGate permission="GRADE_VALIDATE" classId={live.classId}><a href="/school/marks-review">{$t('marks.reviewQueue')}</a></PermissionGate></p>
	{/if}
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{live.aggregateLabel ?? $t('reportCards.overall')}</p>
			<p class="font-display text-2xl font-semibold">
				{live.grading ? formatCalculatedGrade(live.grading) : scale ? formatGrade(live.overallAverage, scale) : live.overallAverage}
				{#if live.grading}<span class="block text-sm">{live.grading.mention.code} · {live.grading.mention.label}</span>{/if}
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
							(moy. {section.grading ? formatCalculatedGrade(section.grading) : scale ? formatGrade(section.sectionAverage, scale) : section.sectionAverage})
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
									{mark.grading ? formatCalculatedGrade(mark.grading) : scale ? formatGrade(mark.average, scale) : mark.average}
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

	<details class="rounded-xl border p-4 text-sm"><summary>{$t('profile.publicationHistory')}</summary><p>{$t('profile.generatedAt')}: {live.generatedAt || $t('profile.notProvided')}</p><p>{$t('profile.publishedAt')}: {live.publishedAt || $t('profile.notProvided')}</p><p>{$t('profile.version')}: {live.version ?? 0}</p>{#each live.publicationHistory ?? [] as snapshot (snapshot.version)}<p class="mt-2">{$t('profile.version')} {snapshot.version} · {String(snapshot.publishedAt ?? '')} · {snapshot.overallAverage ?? '—'} · {snapshot.teacherComment ?? ''} {snapshot.principalComment ?? ''}</p>{/each}</details>
	<ReportSectionComments onWriteReportSectionComments={reportCardsPage.performWriteReportSectionComments} result={live} onSaved={(sections, version) => reportCardsPage.patchResult(live.id, { commentSections: sections, version })} />
	<ReportHomeroomComment result={live} onSaved={(homeroomComment, version) => reportCardsPage.patchResult(live.id, { homeroomComment, version })} />

	{#if live.principalComment}
		<div class="rounded-xl border border-border bg-card p-4">
			<p class="font-sans tabular-nums text-[10px] uppercase text-muted-foreground">{$t('reportCards.principalComment')}</p>
			<p class="mt-1 text-sm">{live.principalComment}</p>
		</div>
	{/if}
</div>
