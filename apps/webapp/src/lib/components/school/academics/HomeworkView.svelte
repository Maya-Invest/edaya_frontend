<script lang="ts">
	import type { Deadline } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { CalendarClock, FileText, Paperclip, Plus } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import DeadlineFormModal from './DeadlineFormModal.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (d: Deadline) => void;
		selectedId?: string;
	} = $props();

	const deadlines = $derived(detailDataContext.deadlinesForClass(classId));

	let filter = $state<'all' | 'open' | 'overdue' | 'done'>('all');
	let createOpen = $state(false);
	const today = new Date('2026-05-22');

	const list = $derived(deadlines);

	const enriched = $derived(
		list.map((d) => {
			const due = new Date(d.dueDate);
			const submitted = d.submissions.filter(s => s.status === 'submitted').length;
			const late = d.submissions.filter(s => s.status === 'late').length;
			const missing = d.submissions.filter(s => s.status === 'missing').length;
			const total = d.submissions.length;
			const ratio = total ? (submitted + late) / total : 0;
			const overdue = due < today && missing > 0;
			const done = ratio === 1;
			return { d, submitted, late, missing, total, ratio, overdue, done, due };
		}),
	);

	const filtered = $derived(
		enriched.filter((e) => {
			if (filter === 'open')
				return !e.done && !e.overdue;
			if (filter === 'overdue')
				return e.overdue;
			if (filter === 'done')
				return e.done;
			return true;
		}),
	);

	const stats = $derived({
		all: enriched.length,
		open: enriched.filter(e => !e.done && !e.overdue).length,
		overdue: enriched.filter(e => e.overdue).length,
		done: enriched.filter(e => e.done).length,
	});

	const filterKeys = ['all', 'open', 'overdue', 'done'] as const;

	function handleCreated(deadlineId: string) {
		appGoto(detailHref.classDeadline(classId, deadlineId));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('hw.eyebrow')}
		title={$t('hw.active', { n: list.length })}
	>
		{#snippet filters()}
			<div class="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
				{#each filterKeys as k (k)}
					<button
						type="button"
						onclick={() => (filter = k)}
						class={cn(
							'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
							filter === k
								? k === 'overdue'
									? 'bg-highlight text-highlight-foreground shadow-soft'
									: 'bg-primary text-primary-foreground shadow-soft'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{$t(`hw.filter.${k}`)}
						<span
							class={cn(
								'rounded-full px-1 font-mono text-[10px]',
								filter === k ? 'bg-primary-foreground/15' : 'bg-secondary text-muted-foreground',
							)}
						>
							{stats[k]}
						</span>
					</button>
				{/each}
			</div>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="GRADE_INPUT" mode="disable" tooltip={$t('hw.permissionCreate')}>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('hw.newDeadline')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<DeadlineFormModal {classId} bind:open={createOpen} onCreated={handleCreated} />

	<div class="space-y-3">
		{#each filtered as { d, submitted, late, missing, total, overdue, done, due } (d.id)}
			{@const active = selectedId === d.id}
			{@const daysLeft = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))}
			<button
				type="button"
				onclick={() => onSelect?.(d)}
				class={cn(
					'group grid w-full grid-cols-12 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
					active && 'border-primary/40 bg-primary/5',
					overdue && 'border-l-4 border-l-highlight',
				)}
			>
				<div class="col-span-5">
					<div class="flex items-center gap-2">
						<span
							class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
						>
							{$t(`deadlineType.${d.type}`)}
						</span>
						<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
							{d.subject}
						</p>
					</div>
					<h3 class="mt-1.5 font-display text-lg font-semibold leading-tight">{d.title}</h3>
					<p class="mt-1 line-clamp-1 text-xs text-muted-foreground">{d.description}</p>
					{#if d.attachments.length > 0}
						<p class="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
							<Paperclip class="h-3 w-3" />
							{$t(d.attachments.length > 1 ? 'hw.filesPlural' : 'hw.files', {
								n: d.attachments.length,
							})}
						</p>
					{/if}
				</div>
				<div class="col-span-3">
					<p class="text-[11px] uppercase tracking-wider text-muted-foreground">
						{$t('hw.due')}
					</p>
					<p class="flex items-center gap-1.5 font-display text-base font-semibold">
						<CalendarClock
							class={cn('h-4 w-4', overdue ? 'text-highlight' : 'text-muted-foreground')}
						/>
						{due.toLocaleDateString($locale, { day: 'numeric', month: 'short' })}
					</p>
					<p
						class={cn(
							'mt-0.5 font-mono text-[11px]',
							overdue ? 'text-highlight' : 'text-muted-foreground',
						)}
					>
						{done
							? $t('hw.allIn')
							: overdue
							? $t('hw.daysOverdue', { n: Math.abs(daysLeft) })
							: $t('hw.daysLeft', { n: daysLeft })}
					</p>
				</div>
				<div class="col-span-4">
					<div class="flex items-center justify-between text-[11px]">
						<span class="text-muted-foreground">{$t('hw.submissions')}</span>
						<span class="font-mono text-foreground">{submitted + late}/{total}</span>
					</div>
					<div class="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-secondary">
						<div
							class="h-full bg-accent"
							style:width="{total ? (submitted / total) * 100 : 0}%"
						></div>
						<div
							class="h-full bg-highlight/70"
							style:width="{total ? (late / total) * 100 : 0}%"
						></div>
					</div>
					<div class="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
						<span class="flex items-center gap-1">
							<span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
							{$t('hw.onTime', { n: submitted })}
						</span>
						<span class="flex items-center gap-1">
							<span class="h-1.5 w-1.5 rounded-full bg-highlight/70"></span>
							{$t('hw.lateCount', { n: late })}
						</span>
						<span class="flex items-center gap-1">
							<span class="h-1.5 w-1.5 rounded-full bg-border"></span>
							{$t('hw.missingCount', { n: missing })}
						</span>
					</div>
				</div>
			</button>
		{/each}
		{#if filtered.length === 0}
			<p
				class="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
			>
				<FileText class="mx-auto mb-2 h-5 w-5" />
				{$t('hw.none')}
			</p>
		{/if}
	</div>
</div>
