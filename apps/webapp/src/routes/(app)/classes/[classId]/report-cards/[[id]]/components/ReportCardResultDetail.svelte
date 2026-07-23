<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Download, FileSpreadsheet } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';
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
	const hasSectionMarks = $derived(
		live.sectionResults.some(section => section.marks.length > 0),
	);
	const periodLabel = $derived(
		academicContext.periods.find(p => p.id === live.academicPeriodId)?.label
			?? live.academicPeriodId,
	);
	let downloading = $state(false);

	function resultStatusLabel(status: ReportCardResult['status']) {
		if (status === 'published') {
			return $t('reportCards.statusPublished');
		}
		if (status === 'generated') {
			return $t('reportCards.statusGenerated');
		}
		return $t('reportCards.statusDraft');
	}

	async function regenerate() {
		await reportCardsPage.generateForStudent({
			studentId: live.studentId,
			successMessage: get(t)('reportCards.toastGenerated', { name: student?.name ?? '' }),
		});
	}

	async function publish() {
		await reportCardsPage.publishResult({
			resultId: live.id,
			successMessage: get(t)('reportCards.toastPublished', { name: student?.name ?? '' }),
		});
	}

	async function downloadPdf() {
		if (downloading) {
			return;
		}
		downloading = true;
		try {
			const status = await reportCardsPage.downloadPdf(live.id);
			if (status === 'ready') {
				toast.info(get(t)('reportCards.toastPdfReady'));
				return;
			}
			if (status === 'pending') {
				toast.info(get(t)('reportCards.toastPdfPending'));
				return;
			}
			if (status === 'missing') {
				toast.info(get(t)('reportCards.toastPdfMissing'));
				return;
			}
			toast.error(get(t)('reportCards.toastPdfError'));
		}
		finally {
			downloading = false;
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
					'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
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
			<PermissionGate
				permission="REPORT_CARD_GENERATE"
				mode="disable"
				tooltip={$t('reportCards.generate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						variant="outline"
						class="rounded-full"
						disabled={disabled || live.status === 'published'}
						{title}
						onclick={regenerate}
					>
						<FileSpreadsheet class="h-3.5 w-3.5" />
						{$t('reportCards.generate')}
					</Button>
				{/snippet}
			</PermissionGate>
			{#if live.status === 'published'}
				<Button
					size="sm"
					variant="outline"
					class="rounded-full"
					disabled={downloading}
					onclick={downloadPdf}
				>
					<Download class="h-4 w-4" />
					{$t('reportCards.downloadPdf')}
				</Button>
			{/if}
			<Button
				size="sm"
				class="rounded-full"
				disabled={live.status !== 'generated'}
				onclick={publish}
			>
				{$t('reportCards.publish')}
			</Button>
		{/snippet}
	</DrawerEntityHeader>

	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.overall')}</p>
			<p class="font-display text-2xl font-semibold">
				{live.overallAverage != null
					? (scale ? formatGrade(live.overallAverage, scale) : live.overallAverage)
					: '—'}
			</p>
		</div>
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.rank')}</p>
			<p class="font-display text-2xl font-semibold">
				{live.classRank != null && live.classSize != null
					? `${live.classRank}/${live.classSize}`
					: '—'}
			</p>
		</div>
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.period')}</p>
			<p class="font-display text-lg font-semibold">{periodLabel}</p>
		</div>
	</div>

	{#if !hasSectionMarks}
		<div class="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
			<p class="font-display text-sm font-semibold text-muted-foreground">{$t('reportCards.sections')}</p>
			<p class="mt-1 text-xs text-muted-foreground">{$t('reportCards.emptyStudentHint')}</p>
		</div>
	{/if}

	{#each live.sectionResults as section (section.sectionId)}
		{#if section.marks.length > 0}
			<div>
				<p class="mb-2 font-display text-sm font-semibold">
					{definition?.sections.find(entry => entry.id === section.sectionId)?.name ?? 'Section'}
					{#if section.sectionAverage !== undefined}
						<span class="ml-2 font-mono text-xs text-muted-foreground">
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
								<div class="text-right">
									<p class="font-mono font-semibold">
										{scale ? formatGrade(mark.average, scale) : mark.average}
									</p>
									{#if mark.rank != null && live.classSize != null}
										<p class="font-mono text-xs text-muted-foreground">
											{mark.rank}/{live.classSize}
										</p>
									{/if}
								</div>
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

	{#if live.homeroomComment}
		<div class="rounded-xl border border-border bg-card p-4">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.homeroomComment')}</p>
			<p class="mt-1 text-sm">{live.homeroomComment}</p>
		</div>
	{/if}

	{#if live.principalComment}
		<div class="rounded-xl border border-border bg-card p-4">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.principalComment')}</p>
			<p class="mt-1 text-sm">{live.principalComment}</p>
		</div>
	{/if}
</div>
