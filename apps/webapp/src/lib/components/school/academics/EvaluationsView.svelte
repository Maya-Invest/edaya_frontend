<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { CalendarDays, Plus } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import EvaluationCreateModal from './EvaluationCreateModal.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (e: Evaluation) => void;
		selectedId?: string;
	} = $props();

	const evaluations = $derived(detailDataContext.evaluationsForClass(classId));

	let createOpen = $state(false);

	function handleCreated(assessmentId: string) {
		appGoto(detailHref.classEvaluation(classId, assessmentId));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('eval.marksBook')}
		title={$t('eval.count', { n: evaluations.length })}
	>
		{#snippet primary()}
			<PermissionGate
				permission="GRADE_INPUT"
				mode="disable"
				tooltip={$t('eval.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('eval.newEvaluation')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<EvaluationCreateModal {classId} bind:open={createOpen} onCreated={handleCreated} />

	<div class="space-y-3">
		{#each evaluations as ev (ev.id)}
			{@const active = selectedId === ev.id}
			{@const progress = ev.total ? (ev.graded / ev.total) * 100 : 0}
			{@const isDone = ev.graded === ev.total}
			<button
				type="button"
				onclick={() => onSelect?.(ev)}
				class={cn(
					'group grid w-full grid-cols-12 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
					active && 'border-primary/40 bg-primary/5',
				)}
			>
				<div class="col-span-5">
					<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						{ev.subject}
					</p>
					<h3 class="mt-1 font-display text-lg font-semibold leading-tight">{ev.title}</h3>
					<p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
						<CalendarDays class="h-3 w-3" />
						{new Date(ev.date).toLocaleDateString($locale, {
							day: 'numeric',
							month: 'short',
							year: 'numeric',
						})}
					</p>
				</div>
				<div class="col-span-2">
					<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.average')}
					</p>
					<p class="font-display text-2xl font-semibold tabular-nums">
						{isDone ? ev.averageMark.toFixed(1) : '—'}
						<span class="ml-1 text-xs font-normal text-muted-foreground">/ {ev.outOf}</span>
					</p>
				</div>
				<div class="col-span-2">
					<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('eval.coefficient')}
					</p>
					<p class="font-mono text-base">×{ev.coefficient}</p>
				</div>
				<div class="col-span-3">
					<div class="flex items-center justify-between text-[11px] text-muted-foreground">
						<span>{$t('eval.graded')}</span>
						<span class="font-mono">{ev.graded}/{ev.total}</span>
					</div>
					<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
						<div
							class={cn('h-full rounded-full', isDone ? 'bg-accent' : 'bg-highlight')}
							style:width="{progress}%"
						></div>
					</div>
				</div>
			</button>
		{/each}
		{#if evaluations.length === 0}
			<p
				class="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
			>
				{$t('eval.none')}
			</p>
		{/if}
	</div>
</div>
