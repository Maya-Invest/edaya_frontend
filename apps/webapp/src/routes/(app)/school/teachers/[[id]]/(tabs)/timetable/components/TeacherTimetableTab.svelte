<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Teacher } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		formatPlanningWeekRange,
		formatWeekAnchor,
		parseWeekAnchor,
		shiftWeek,
	} from '$lib/components/school/scheduling/planning-calendar';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { lang, t } from '$lib/i18n';
	import { CalendarDays, ChevronLeft, ChevronRight } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { getTeacherTimetableTabState } from '../teacher-timetable-tab.svelte';

	type TimetableEvent = components['schemas']['TimetableEvent'];

	const { teacher }: { teacher: Teacher } = $props();
	const timetableTab = getTeacherTimetableTabState();

	const weekStart = $derived(parseWeekAnchor($page.url.searchParams.get('week') ?? undefined));
	const week = $derived(formatWeekAnchor(weekStart));
	const events = $derived(timetableTab.eventsFor(teacher.id, week));
	const weekRange = $derived(formatPlanningWeekRange(weekStart, $lang));

	const dayGroups = $derived.by(() => {
		const dates = [...new Set(events.map(event => event.startsAt.slice(0, 10)))]
			.sort((left, right) => left.localeCompare(right));
		return dates.map(date => ({
			date,
			events: events
				.filter(event => event.startsAt.slice(0, 10) === date)
				.sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
		}));
	});

	function setWeek(next: Date) {
		const url = new URL($page.url);
		url.searchParams.set('week', formatWeekAnchor(next));
		void appGoto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	function classLabel(classGroupId: string): string {
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function formatTime(value: string): string {
		return new Date(value).toLocaleTimeString($lang, { hour: '2-digit', minute: '2-digit' });
	}

	function eventHref(event: TimetableEvent): string {
		if (event.kind === 'assessment' && event.assessmentId) {
			return detailHref.classEvaluation(event.classGroupId, event.assessmentId);
		}
		return detailHref.classPlanning(event.classGroupId, event.lessonSessionId ?? event.id);
	}

	function formatDay(date: string): string {
		return new Date(`${date}T12:00:00`).toLocaleDateString($lang, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
		});
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between gap-2">
		<Button
			variant="outline"
			size="icon"
			class="h-8 w-8 rounded-full"
			aria-label={$t('planning.prevWeek')}
			onclick={() => setWeek(shiftWeek(weekStart, -1))}
		>
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<p class="text-center text-xs font-medium text-muted-foreground">
			{$t('planning.weekRange', weekRange)}
		</p>
		<Button
			variant="outline"
			size="icon"
			class="h-8 w-8 rounded-full"
			aria-label={$t('planning.nextWeek')}
			onclick={() => setWeek(shiftWeek(weekStart, 1))}
		>
			<ChevronRight class="h-4 w-4" />
		</Button>
	</div>

	{#if dayGroups.length === 0}
		<DrawerEmptyState label={$t('teacher.timetableEmpty')}>
			{#snippet icon()}
				<CalendarDays class="h-5 w-5 text-muted-foreground" />
			{/snippet}
		</DrawerEmptyState>
	{:else}
		<div class="space-y-4">
			{#each dayGroups as group (group.date)}
				<div class="space-y-2">
					<h4 class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{formatDay(group.date)}
					</h4>
					<ul class="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
						{#each group.events as event (event.id)}
							<li>
								<a
									href={eventHref(event)}
									class="flex items-start justify-between gap-3 px-4 py-3 hover:bg-secondary/40"
								>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{event.title}</p>
										<p class="mt-1 text-xs text-muted-foreground">
											{classLabel(event.classGroupId)}
											{#if event.subjectLabel}
												· {event.subjectLabel}
											{/if}
										</p>
									</div>
									<div class="shrink-0 text-right text-xs text-muted-foreground">
										{formatTime(event.startsAt)} – {formatTime(event.endsAt)}
									</div>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{/if}
</div>
