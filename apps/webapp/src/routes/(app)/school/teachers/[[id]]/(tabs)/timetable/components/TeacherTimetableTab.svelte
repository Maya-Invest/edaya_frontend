<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import type { TeacherTimetableEvent } from '../../../../lib/teacher-timetable';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { formatLocaleDate, isoToZonedDateAndTime } from '$lib/date/format';
	import { detailHref } from '$lib/detail-hrefs';
	import { lang, t } from '$lib/i18n';
	import { CalendarDays } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { tick, untrack } from 'svelte';
	import { teacherTimetableContextKey, teacherTimetableDays, timetableTargetDate, validTimetableDate } from '../../../../lib/teacher-timetable';
	import { getTeacherTimetableTabState } from '../teacher-timetable-tab.svelte';

	const { teacher }: { teacher: Teacher } = $props();
	const timetableTab = getTeacherTimetableTabState();
	const context = $derived(timetableTab.context());
	const scopeKey = $derived(context ? `${teacher.id}:${teacherTimetableContextKey(context)}` : '');
	const events = $derived(timetableTab.eventsFor(teacher.id));
	const today = $derived(isoToZonedDateAndTime(new Date().toISOString(), context?.timeZone ?? 'UTC').date);
	const targetDate = $derived(context ? timetableTargetDate($page.url.searchParams, today, context) : '');
	const todayInYear = $derived(Boolean(context && today >= context.startDate && today <= context.endDate));
	const dayGroups = $derived(context ? teacherTimetableDays(events, context, targetDate) : []);

	let scroller = $state<HTMLDivElement>();
	let visibleCount = $state(30);
	let scrollRequest = $state(0);
	let announcement = $state('');
	let renderedScope = '';

	function formatDay(date: string): string {
		return formatLocaleDate(date, $lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}

	async function navigateDate(date: string) {
		if (!context || !validTimetableDate(date) || date < context.startDate || date > context.endDate)
			return;
		const url = new URL($page.url);
		url.searchParams.set('date', date);
		url.searchParams.delete('week');
		await appGoto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true, noScroll: true });
		scrollRequest += 1;
	}

	$effect(() => {
		if (context && $page.url.searchParams.has('week')) {
			const date = targetDate;
			untrack(() => void navigateDate(date));
		}
	});

	$effect(() => {
		const date = targetDate;
		const scope = scopeKey;
		const groups = dayGroups;
		const node = scroller;
		const requested = scrollRequest;
		if (!date || !node)
			return;
		const targetIndex = groups.findIndex(group => group.date === date);
		untrack(() => {
			visibleCount = Math.min(groups.length, Math.max(renderedScope === scope ? visibleCount : 30, targetIndex + 31));
			renderedScope = scope;
		});
		let cancelled = false;
		void tick().then(() => {
			if (cancelled || !node.isConnected)
				return;
			const heading = node.querySelector<HTMLElement>(`[data-timetable-date="${date}"]`);
			if (!heading)
				return;
			const top = heading.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop;
			node.scrollTo({ top: Math.max(0, top), behavior: requested > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
			announcement = $t('teacher.timetableJumped', { date: formatDay(date) });
		});
		return () => {
			cancelled = true;
		};
	});

	function classLabel(classGroupId: string): string {
		return academicContext.classes.find(entry => entry.id === classGroupId)?.name ?? classGroupId;
	}

	function formatTime(value: string): string {
		return new Date(value).toLocaleTimeString($lang, { timeZone: context?.timeZone ?? 'UTC', hour: '2-digit', minute: '2-digit' });
	}

	function eventHref(event: TeacherTimetableEvent): string {
		if (event.kind === 'assessment' && event.assessmentId)
			return detailHref.classEvaluation(event.classGroupId, event.assessmentId);
		return detailHref.classPlanning(event.classGroupId, event.lessonSessionId ?? event.id);
	}
</script>

<div class="flex h-full min-h-0 flex-col gap-3" data-testid="teacher-year-timetable">
	{#if context}
		<div class="flex shrink-0 flex-wrap items-end gap-3 border-b border-border bg-card py-2" data-testid="teacher-timetable-controls">
			<div class="space-y-1">
				<Label for="teacher-timetable-date">{$t('teacher.timetableGoToDate')}</Label>
				<Input class="ui-query-control" id="teacher-timetable-date" type="date" min={context.startDate} max={context.endDate} value={targetDate} onchange={event => navigateDate(event.currentTarget.value)} />
			</div>
			<Button variant="outline" disabled={!todayInYear} title={todayInYear ? undefined : $t('teacher.timetableTodayOutsideYear')} onclick={() => navigateDate(today)}>
				{$t('teacher.timetableToday')}
			</Button>
			{#if !todayInYear}<p class="w-full text-xs text-muted-foreground">{$t('teacher.timetableTodayOutsideYear')}</p>{/if}
		</div>
		<p class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (The named scroll region must be focusable for keyboard scrolling.) -->
		<div bind:this={scroller} role="region" aria-label={$t('drawer.tab.timetable')} tabindex="0" data-testid="teacher-timetable-sessions" class="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
			{#if events.length === 0}
				<p class="text-sm text-muted-foreground">{$t('teacher.timetableEmpty')}</p>
			{/if}
			<InfiniteList hasMore={visibleCount < dayGroups.length} onLoadMore={() => visibleCount = Math.min(dayGroups.length, visibleCount + 30)}>
				<div class="space-y-4">
					{#each dayGroups.slice(0, visibleCount) as group (group.date)}
						<section class="space-y-2" aria-labelledby={`teacher-timetable-${group.date}`}>
							<h4 id={`teacher-timetable-${group.date}`} data-timetable-date={group.date} class="text-[11px] font-bold uppercase tracking-wider text-black">{formatDay(group.date)}</h4>
							{#if group.events.length === 0}
								<p data-testid="teacher-timetable-empty-date" class="rounded-collection border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{$t('teacher.timetableNoSessions')}</p>
							{:else}
								<ul class="divide-y divide-border/60 overflow-hidden rounded-collection border border-border bg-card">
									{#each group.events as event (`${event.kind}:${event.id}`)}
										<li>
											<a href={eventHref(event)} data-testid="teacher-timetable-session" class="flex flex-wrap items-start justify-between gap-3 px-4 py-3 hover:bg-secondary/40">
												<div class="min-w-0 flex-1">
													<p class="break-words text-sm font-medium">{event.title}</p>
													<p class="mt-1 text-xs text-muted-foreground">{classLabel(event.classGroupId)}{#if event.subjectLabel} · {event.subjectLabel}{/if}</p>
												</div>
												<div class="shrink-0 text-right text-xs text-muted-foreground">{formatTime(event.startsAt)} – {formatTime(event.endsAt)}</div>
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</section>
					{/each}
				</div>
			</InfiniteList>
		</div>
	{:else}
		<DrawerEmptyState label={$t('teacher.timetableNoYear')}>
			{#snippet icon()}<CalendarDays class="h-5 w-5 text-muted-foreground" />{/snippet}
		</DrawerEmptyState>
	{/if}
</div>
