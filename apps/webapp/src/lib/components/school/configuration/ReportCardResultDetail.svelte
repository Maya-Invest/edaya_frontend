<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';
	import { publishReportCardResultMutation } from '$lib/api/mutations/report-cards.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatGrade } from '$lib/types/report-cards';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';

	const { result }: { result: ReportCardResult } = $props();

	const live = $derived(reportCardsContext.results.find(r => r.id === result.id) ?? result);
	const student = $derived(detailDataContext.students.find(s => s.id === live.studentId));
	const definition = $derived(reportCardsContext.definitions.find(d => d.id === live.definitionId));
	const scale = $derived(reportCardsContext.scales.find(s => s.id === live.gradeScaleId));

	const statusLabel: Record<ReportCardResult['status'], string> = {
		draft: 'Brouillon',
		generated: 'Généré',
		published: 'Publié',
	};

	async function publish() {
		const ok = await publishReportCardResultMutation(
			live.id,
			live.studentId,
			live.academicPeriodId,
			live.definitionId,
		);
		if (ok) {
			toast.success(get(t)('reportCards.toastPublished', { name: student?.name ?? '' }));
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
				{statusLabel[live.status]}
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
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.overall')}</p>
			<p class="font-display text-2xl font-semibold">
				{scale ? formatGrade(live.overallAverage, scale) : live.overallAverage}
			</p>
		</div>
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.rank')}</p>
			<p class="font-display text-2xl font-semibold">{live.classRank}/{live.classSize}</p>
		</div>
		<div class="rounded-xl border border-border bg-secondary/30 p-3 text-center">
			<p class="font-mono text-[10px] uppercase text-muted-foreground">{$t('reportCards.period')}</p>
			<p class="font-display text-lg font-semibold">{live.academicPeriodId}</p>
		</div>
	</div>

	{#each live.sectionResults as section (section.sectionId)}
		{#if section.marks.length > 0}
			<div>
				<p class="mb-2 font-display text-sm font-semibold">
					{definition?.sections.find(s => s.id === section.sectionId)?.name ?? 'Section'}
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
								<p class="font-mono font-semibold">
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
