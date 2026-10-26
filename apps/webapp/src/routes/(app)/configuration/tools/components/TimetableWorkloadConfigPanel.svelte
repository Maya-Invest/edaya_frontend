<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { ClassNode, GradeLevel, School } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import { t } from '$lib/i18n';
	import { resolvedPeriodSpanPlaceholder } from '$lib/scheduling/timetable-placement-parameters';
	import { BADGE_WARN, ROW_ACTIVE } from '$lib/ui-tones';
	import { cn } from '$lib/utils';
	import { timetableClassGroups } from '../timetable-planning';

	type ClassSubject = components['schemas']['ClassSubject'];

	let {
		classes = [],
		gradeLevels = [],
		includedClassIds = $bindable<string[]>([]),
		classSubjects,
		subjectLabels,
		teacherLabelsByClassSubjectId = {},
		school = null,
		selectedClassId = $bindable(''),
		overrides = $bindable<Record<string, number>>({}),
		minSpanOverrides = $bindable<Record<string, number>>({}),
		maxSpanOverrides = $bindable<Record<string, number>>({}),
		loading = false,
		disabled = false,
	}: {
		classes?: ClassNode[];
		gradeLevels?: GradeLevel[];
		includedClassIds?: string[];
		classSubjects: ClassSubject[];
		subjectLabels: Record<string, string>;
		teacherLabelsByClassSubjectId?: Record<string, string>;
		school?: School | null;
		selectedClassId?: string;
		overrides?: Record<string, number>;
		minSpanOverrides?: Record<string, number>;
		maxSpanOverrides?: Record<string, number>;
		loading?: boolean;
		disabled?: boolean;
	} = $props();

	let search = $state('');

	const included = $derived(new Set(includedClassIds));
	const includedCount = $derived(classes.filter(row => included.has(row.id)).length);
	const groups = $derived(timetableClassGroups(classes, gradeLevels, search));
	const groupCounts = $derived(new Map(timetableClassGroups(classes, gradeLevels, '').map(group => [group.id, {
		selected: group.classes.filter(row => included.has(row.id)).length,
		total: group.classes.length,
	}])));
	const subjectsForClass = $derived(
		classSubjects
			.filter(subject => included.has(selectedClassId) && subject.classGroupId === selectedClassId && subject.isOffered !== false)
			.sort((left, right) => {
				const leftLabel = subjectLabels[left.subjectId] ?? left.subjectId;
				const rightLabel = subjectLabels[right.subjectId] ?? right.subjectId;
				return leftLabel.localeCompare(rightLabel);
			}),
	);

	function toggleClass(id: string, checked: boolean) {
		if (disabled)
			return;
		includedClassIds = checked ? [...new Set([...includedClassIds, id])] : includedClassIds.filter(value => value !== id);
	}

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

<div class="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0 lg:flex-row">
	<aside aria-label={$t('timetable.classesToGenerate')} class="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/20 lg:w-56" data-testid="timetable-class-selection">
		<div class="shrink-0 space-y-2 border-b border-border/60 p-2.5">
			<div>
				<p class="text-sm font-medium">{$t('timetable.classListTitle')}</p>
				<p class="text-xs text-muted-foreground" aria-live="polite" data-testid="timetable-selection-count">{$t('timetable.selectedClassCount', { selected: includedCount, total: classes.length })}</p>
			</div>
			<label class="block">
				<span class="sr-only">{$t('timetable.searchClasses')}</span>
				<ListSearchField bind:value={search} placeholder={$t('timetable.searchClasses')} />
			</label>
			<div class="flex flex-wrap gap-1">
				<Button variant="ghost" size="sm" class="h-auto min-h-11 whitespace-normal px-1.5 py-2 text-sm" disabled={disabled || !classes.length} onclick={() => { includedClassIds = classes.map(row => row.id); }} data-testid="timetable-select-all">{$t('timetable.selectAllClasses')}</Button>
				<Button variant="ghost" size="sm" class="h-auto min-h-11 whitespace-normal px-1.5 py-2 text-sm" disabled={disabled || !includedCount} onclick={() => { includedClassIds = []; }} data-testid="timetable-clear-selection">{$t('timetable.clearClassSelection')}</Button>
			</div>
		</div>
		<div class="max-h-48 min-h-0 space-y-3 overflow-y-auto p-1.5 lg:max-h-none lg:flex-1" data-testid="timetable-class-options">
			{#each groups as group (group.id)}
				{@const counts = groupCounts.get(group.id)!}
				<section aria-label={group.label || $t('timetable.unassignedGradeLevel')} data-testid="timetable-class-grade">
					<h3 class="flex items-baseline justify-between gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
						<span class="min-w-0 break-words">{group.label || $t('timetable.unassignedGradeLevel')}</span>
						<span class="shrink-0 font-normal tabular-nums" aria-label={$t('timetable.selectedClassCount', counts)} data-testid="timetable-grade-count">{counts.selected}/{counts.total}</span>
					</h3>
					<ul>
						{#each group.classes as classGroup (classGroup.id)}
							<li class={cn('flex items-center rounded-lg', selectedClassId === classGroup.id && included.has(classGroup.id) && ROW_ACTIVE)}>
								<label class="flex min-h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
									<Checkbox checked={included.has(classGroup.id)} onCheckedChange={checked => toggleClass(classGroup.id, checked)} {disabled} aria-label={$t('timetable.includeClass', { name: classGroup.name })} data-testid="timetable-class-checkbox" data-class-id={classGroup.id} />
								</label>
								<Button variant="ghost" class="h-auto min-h-11 min-w-0 flex-1 justify-start whitespace-normal break-words py-2 pl-0 pr-2 text-left" disabled={disabled || !included.has(classGroup.id)} aria-current={selectedClassId === classGroup.id ? 'true' : undefined} data-testid="timetable-workload-class" data-class-id={classGroup.id} onclick={() => (selectedClassId = classGroup.id)}>{classGroup.name}</Button>
							</li>
						{/each}
					</ul>
				</section>
			{:else}
				<p class="px-2 py-3 text-sm text-muted-foreground" role="status">{$t(classes.length ? 'picker.noResults' : 'timetable.noClassesForYear')}</p>
			{/each}
		</div>
	</aside>

	<section class="flex min-h-48 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 lg:min-h-0" data-testid="timetable-subject-editor">
		<div class="shrink-0 border-b border-border/60 px-3 py-2">
			<p class="break-words text-sm font-medium" aria-live="polite" data-testid="timetable-active-class">
				{classes.find(row => row.id === selectedClassId)?.name ?? $t('timetable.workloadOverrides')}
			</p>
			<p class="text-xs text-muted-foreground">{$t('timetable.workloadOverridesHint')}</p>
		</div>
		<div class="min-h-0 flex-1 p-2 lg:overflow-y-auto">
			{#if loading}
				<p class="py-6 text-center text-sm text-muted-foreground">{$t('dataState.loading')}</p>
			{:else if !includedCount}
				<p class="py-6 text-center text-sm text-muted-foreground" role="status">{$t(classes.length ? 'timetable.selectAtLeastOneClass' : 'timetable.noClassesForYear')}</p>
			{:else if subjectsForClass.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">{$t('timetable.noSubjectsForClass')}</p>
			{:else}
				<ul class="space-y-1.5">
					{#each subjectsForClass as subject (subject.id)}
						{@const teacher = teacherLabel(subject.id)}
						{@const spanDefaults = spanPlaceholder(subject)}
						<li class="flex flex-col-reverse items-stretch gap-4 rounded-lg border border-border/50 bg-secondary/30 p-4 sm:flex-row sm:items-center">
							<div class="flex shrink-0 flex-wrap items-center gap-2">
								<label class="flex flex-col items-center gap-0.5">
									<span class="text-xs leading-none text-muted-foreground">{$t('timetable.periodsPerWeekShort')}</span>
									<Input
										type="number"
										{disabled}
										data-testid="timetable-workload-periods"
										min="0"
										class="min-h-11 w-16 px-2 text-center text-sm"
										value={String(overrides[subject.id] ?? '')}
										placeholder={String(subject.periodsPerWeek ?? '')}
										oninput={event => (overrides = setOverride(overrides, subject.id, event.currentTarget.value))}
									/>
								</label>
								<label class="flex flex-col items-center gap-0.5">
									<span class="text-xs leading-none text-muted-foreground">{$t('timetable.minPeriodSpanShort')}</span>
									<Input
										type="number"
										{disabled}
										min="1"
										class="min-h-11 w-16 px-2 text-center text-sm"
										value={String(minSpanOverrides[subject.id] ?? '')}
										placeholder={String(spanDefaults.min)}
										oninput={event => (minSpanOverrides = setOverride(minSpanOverrides, subject.id, event.currentTarget.value))}
									/>
								</label>
								<label class="flex flex-col items-center gap-0.5">
									<span class="text-xs leading-none text-muted-foreground">{$t('timetable.maxPeriodSpanShort')}</span>
									<Input
										type="number"
										{disabled}
										min="1"
										class="min-h-11 w-16 px-2 text-center text-sm"
										value={String(maxSpanOverrides[subject.id] ?? '')}
										placeholder={String(spanDefaults.max)}
										oninput={event => (maxSpanOverrides = setOverride(maxSpanOverrides, subject.id, event.currentTarget.value))}
									/>
								</label>
							</div>
							<div class="min-w-0 flex-1">
								<p class="break-words text-sm font-medium leading-tight">{subjectLabels[subject.subjectId] ?? subject.subjectId}</p>
								<p class={cn('mt-0.5 break-words text-xs leading-tight', teacher ? 'text-muted-foreground' : BADGE_WARN)}>
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
