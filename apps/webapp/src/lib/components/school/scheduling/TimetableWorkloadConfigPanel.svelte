<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { School } from '$lib/types/school';
	import type { TimetableWorkloadClass } from './timetable-generation-ui';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { Search } from '$lib/icons';
	import { BADGE_WARN, ROW_ACTIVE } from '$lib/ui-tones';
	import { cn } from '$lib/utils';
	import { resolvedPeriodSpanPlaceholder } from './timetable-placement-parameters';

	type ClassSubject = components['schemas']['ClassSubject'];

	let {
		classes = [],
		classSubjects,
		subjectLabels,
		teacherLabelsByClassSubjectId = {},
		school = null,
		activeClassId: explicitActiveClassId = '',
		selectedClassId = $bindable(''),
		overrides = $bindable<Record<string, number>>({}),
		minSpanOverrides = $bindable<Record<string, number>>({}),
		maxSpanOverrides = $bindable<Record<string, number>>({}),
		loading = false,
	}: {
		classes?: TimetableWorkloadClass[];
		classSubjects: ClassSubject[];
		subjectLabels: Record<string, string>;
		teacherLabelsByClassSubjectId?: Record<string, string>;
		school?: School | null;
		activeClassId?: string;
		selectedClassId?: string;
		overrides?: Record<string, number>;
		minSpanOverrides?: Record<string, number>;
		maxSpanOverrides?: Record<string, number>;
		loading?: boolean;
	} = $props();

	let search = $state('');

	const showClassPicker = $derived(classes.length > 1);
	const filteredClasses = $derived(
		classes.filter(row => row.name.toLowerCase().includes(search.trim().toLowerCase())),
	);
	const activeClassId = $derived(
		showClassPicker
			? (selectedClassId || filteredClasses[0]?.id || '')
			: (explicitActiveClassId || classes[0]?.id || classSubjects[0]?.classGroupId || ''),
	);
	const subjectsForClass = $derived(
		classSubjects
			.filter(subject => subject.classGroupId === activeClassId && subject.isOffered !== false)
			.sort((left, right) => {
				const leftLabel = subjectLabels[left.subjectId] ?? left.subjectId;
				const rightLabel = subjectLabels[right.subjectId] ?? right.subjectId;
				return leftLabel.localeCompare(rightLabel);
			}),
	);

	$effect(() => {
		if (!showClassPicker || !filteredClasses.length) {
			return;
		}
		if (!selectedClassId || !filteredClasses.some(row => row.id === selectedClassId)) {
			selectedClassId = filteredClasses[0]!.id;
		}
	});

	function setOverride(
		target: Record<string, number>,
		classSubjectId: string,
		value: string,
	): Record<string, number> {
		const next = { ...target };
		if (value === '') {
			delete next[classSubjectId];
		}
		else {
			next[classSubjectId] = Number(value);
		}
		return next;
	}

	function teacherLabel(classSubjectId: string): string {
		return teacherLabelsByClassSubjectId[classSubjectId] ?? '';
	}

	function spanPlaceholder(subject: ClassSubject): { min: number; max: number } {
		return resolvedPeriodSpanPlaceholder(subject, school ?? undefined);
	}
</script>

<div class={cn('flex h-full min-h-0 gap-3', showClassPicker && 'lg:flex-row')}>
	{#if showClassPicker}
		<aside class="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20 lg:w-48">
			<div class="shrink-0 border-b border-border/60 p-2.5">
				<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{$t('common.class')}</p>
				<div class="relative mt-2">
					<Search class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input bind:value={search} class="h-8 pl-7 text-xs" placeholder={$t('timetable.searchClasses')} />
				</div>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto p-1.5">
				{#each filteredClasses as classGroup (classGroup.id)}
					<button
						type="button"
						data-testid="timetable-workload-class"
						class={cn(
							'mb-0.5 w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
							activeClassId === classGroup.id ? ROW_ACTIVE : 'hover:bg-secondary/80',
						)}
						onclick={() => (selectedClassId = classGroup.id)}
					>
						{classGroup.name}
					</button>
				{/each}
			</div>
		</aside>
	{/if}

	<section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70">
		<div class="shrink-0 border-b border-border/60 px-3 py-2">
			<p class="text-sm font-medium">
				{showClassPicker
					? (classes.find(row => row.id === activeClassId)?.name ?? $t('timetable.workloadOverrides'))
					: $t('timetable.workloadOverrides')}
			</p>
			<p class="text-xs text-muted-foreground">{$t('timetable.workloadOverridesHint')}</p>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto p-2">
			{#if loading}
				<p class="py-6 text-center text-sm text-muted-foreground">{$t('dataState.loading')}</p>
			{:else if subjectsForClass.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">{$t('timetable.noSubjectsForClass')}</p>
			{:else}
				<ul class="space-y-1.5">
					{#each subjectsForClass as subject (subject.id)}
						{@const teacher = teacherLabel(subject.id)}
						{@const spanDefaults = spanPlaceholder(subject)}
						<li class="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2">
							<div class="flex shrink-0 items-center gap-1.5">
								<label class="flex flex-col items-center gap-0.5">
									<span class="text-[10px] leading-none text-muted-foreground">{$t('timetable.periodsPerWeekShort')}</span>
									<Input
										type="number"
										data-testid="timetable-workload-periods"
										min="0"
										class="h-8 w-12 px-1 text-center text-sm"
										value={String(overrides[subject.id] ?? '')}
										placeholder={String(subject.periodsPerWeek ?? '')}
										oninput={event => (overrides = setOverride(overrides, subject.id, event.currentTarget.value))}
									/>
								</label>
								<label class="flex flex-col items-center gap-0.5">
									<span class="text-[10px] leading-none text-muted-foreground">{$t('timetable.minPeriodSpanShort')}</span>
									<Input
										type="number"
										min="1"
										class="h-8 w-12 px-1 text-center text-sm"
										value={String(minSpanOverrides[subject.id] ?? '')}
										placeholder={String(spanDefaults.min)}
										oninput={event => (minSpanOverrides = setOverride(minSpanOverrides, subject.id, event.currentTarget.value))}
									/>
								</label>
								<label class="flex flex-col items-center gap-0.5">
									<span class="text-[10px] leading-none text-muted-foreground">{$t('timetable.maxPeriodSpanShort')}</span>
									<Input
										type="number"
										min="1"
										class="h-8 w-12 px-1 text-center text-sm"
										value={String(maxSpanOverrides[subject.id] ?? '')}
										placeholder={String(spanDefaults.max)}
										oninput={event => (maxSpanOverrides = setOverride(maxSpanOverrides, subject.id, event.currentTarget.value))}
									/>
								</label>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium leading-tight">{subjectLabels[subject.subjectId] ?? subject.subjectId}</p>
								<p class={cn('mt-0.5 truncate text-xs leading-tight', teacher ? 'text-muted-foreground' : BADGE_WARN)}>
									{teacher || $t('timetable.noTeacherAssigned')}
								</p>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>
</div>
