<script lang="ts">
	import type { AttendanceDay } from '$lib/types/school';
	import { page } from '$app/stores';
	import { attendanceSheetSourceId } from '$lib/api/documents-data';
	import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { locale, t } from '$lib/i18n';
	import { CalendarDays, ClipboardCheck } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readClassAttendanceListFilters, writeClassAttendanceListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getAttendancePageState } from '../attendance-page.svelte';

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (day: AttendanceDay) => void;
		selectedId?: string;
	} = $props();

	type CompletionFilter = 'all' | 'marked' | 'partial' | 'unmarked';
	const completionKeys = ['all', 'marked', 'partial', 'unmarked'] as const;

	const attendancePage = getAttendancePageState();
	const days = $derived(attendancePage.daysFor(classId));
	const initialFilters = $derived(readClassAttendanceListFilters($page.url));

	const listFilters = new ListFiltersState<{ completion: string }>(
		{
			getUrl: () => $page.url,
			write: writeClassAttendanceListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readClassAttendanceListFilters($page.url),
	);

	const completion = $derived(
		completionKeys.includes(listFilters.values.completion as CompletionFilter)
			? listFilters.values.completion as CompletionFilter
			: 'all',
	);

	function completionOf(day: AttendanceDay): Exclude<CompletionFilter, 'all'> {
		if (day.totalStudents === 0 || day.recordedCount === 0) {
			return 'unmarked';
		}
		if (day.recordedCount >= day.totalStudents) {
			return 'marked';
		}
		return 'partial';
	}

	const filteredDays = $derived(
		completion === 'all'
			? days
			: days.filter(day => completionOf(day) === completion),
	);

	async function exportAttendanceSheet() {
		const day = filteredDays.find(entry => entry.id === selectedId) ?? filteredDays[0];
		if (!day) {
			return;
		}
		await requestDocumentIssuanceMutation({
			templateKey: 'attendance-sheet.v1',
			sourceId: attendanceSheetSourceId(classId, day.date.slice(0, 10)),
			classGroupId: classId,
			successMessage: get(t)('documents.toastRequested'),
		});
	}

	const completionFilterActive = $derived(completion !== 'all' ? 1 : 0);

	const completionOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		{ value: 'marked', label: $t('attendanceDay.completion.marked') },
		{ value: 'partial', label: $t('attendanceDay.completion.partial') },
		{ value: 'unmarked', label: $t('attendanceDay.completion.unmarked') },
	] as const);

	$effect(() => {
		listFilters.hydrate({
			completion: completionKeys.includes(initialFilters.completion as CompletionFilter)
				? initialFilters.completion
				: 'all',
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.completion;
		listFilters.scheduleSync();
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('attendanceDay.eyebrow')}
		title={$t('attendanceDay.count', { n: filteredDays.length })}
	>
		{#snippet filters()}
			<FilterPanel activeCount={completionFilterActive} title={$t('attendanceDay.completionFilter')}>
				<FilterSelect
					bind:value={listFilters.values.completion}
					class="h-9 w-full rounded-md text-xs"
					options={[...completionOptions]}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly exportLabel={$t('documents.exportAttendance')} onExport={() => void exportAttendanceSheet()} />
		{/snippet}
	</ListPageHeader>

	<div class="space-y-3">
		{#each filteredDays as day (day.id)}
			{@const active = selectedId === day.id}
			{@const progress = day.totalStudents
				? (day.recordedCount / day.totalStudents) * 100
				: 0}
			{@const isComplete = day.totalStudents > 0 && day.recordedCount === day.totalStudents}
			<button
				type="button"
				onclick={() => onSelect?.(day)}
				class={cn(
					'group grid w-full grid-cols-12 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
					active && 'border-primary/40 bg-primary/5',
				)}
			>
				<div class="col-span-7">
					<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('attendanceDay.dailyRollCall')}
					</p>
					<h3 class="mt-1 font-display text-lg font-semibold leading-tight">{day.label}</h3>
					<p class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
						<CalendarDays class="h-3 w-3" />
						{new Date(day.date).toLocaleDateString($locale, {
							weekday: 'long',
							day: 'numeric',
							month: 'short',
							year: 'numeric',
						})}
					</p>
				</div>
				<div class="col-span-5">
					<div class="flex items-center justify-between text-[11px] text-muted-foreground">
						<span class="inline-flex items-center gap-1">
							<ClipboardCheck class="h-3 w-3" />
							{$t('attendanceDay.recorded')}
						</span>
						<span class="font-sans tabular-nums">{day.recordedCount}/{day.totalStudents}</span>
					</div>
					<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
						<div
							class={cn('h-full rounded-full', isComplete ? 'bg-accent' : 'bg-highlight')}
							style:width="{progress}%"
						></div>
					</div>
				</div>
			</button>
		{/each}
		{#if filteredDays.length === 0}
			<p
				class="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
			>
				{$t('attendanceDay.none')}
			</p>
		{/if}
	</div>
</div>
