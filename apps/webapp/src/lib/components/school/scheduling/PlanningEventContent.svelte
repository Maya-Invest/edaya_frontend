<script lang="ts">
	import { t } from '$lib/i18n';
	import { ClipboardCheck } from '$lib/icons';
	import { planningEventCellContent } from './planning-calendar';
	import { getPlanningTimetableContext } from './planning-timetable-context';

	const {
		event,
		mode = 'boxes',
	}: {
		event: Record<string, unknown>;
		mode?: string;
	} = $props();

	const actions = getPlanningTimetableContext();

	function formatTime(value: unknown) {
		if (!(value instanceof Date))
			return '';
		return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function handleAttendance(clickEvent: MouseEvent) {
		clickEvent.stopPropagation();
		if (typeof actions?.onAttendance !== 'function')
			return;
		const target = clickEvent.currentTarget;
		if (!(target instanceof HTMLElement))
			return;
		const id = target.dataset.eventId;
		if (id)
			actions.onAttendance(id);
	}

	const cellContent = $derived(planningEventCellContent({
		kind: event.kind as Parameters<typeof planningEventCellContent>[0]['kind'],
		subject: String(event.subject ?? ''),
		text: String(event.text ?? ''),
		teacher: String(event.teacher ?? ''),
	}));

	const showAttendance = $derived.by(
		() => event.kind !== 'homework-due'
			&& event.kind !== 'school-calendar'
			&& event.allDay !== true
			&& event.status !== 'cancelled',
	);
	const showTimes = $derived.by(
		() => mode !== 'bars'
			&& event.kind !== 'school-calendar'
			&& event.allDay !== true,
	);
	const compactBar = $derived(mode === 'bars');
	const isDraft = $derived(event.timetableGenerated === 'draft');
</script>

{#if compactBar}
	<div class="flex h-full min-h-0 items-center px-1">
		<p class="truncate text-[11px] font-semibold leading-none">{cellContent.primary}</p>
	</div>
{:else}
	<div class="flex h-full min-h-0 flex-col justify-center gap-px pr-6">
		{#if showTimes}
			<p class="font-sans tabular-nums text-[9px] leading-none tracking-tight text-muted-foreground/90">
				{formatTime(event.start)}–{formatTime(event.end)}
				{#if isDraft}
					<span class="ml-1 uppercase">· {$t('timetable.draft')}</span>
				{/if}
			</p>
		{/if}
		<p class="truncate text-xs font-semibold leading-tight">{cellContent.primary}</p>
		{#if cellContent.secondary}
			<p class="truncate text-[10px] leading-tight text-muted-foreground">{cellContent.secondary}</p>
		{/if}
		{#if showAttendance}
			<button
				type="button"
				data-event-id={String(event.id ?? '')}
				title={$t('calendar.takeAttendance')}
				onclick={handleAttendance}
				class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
			>
				<ClipboardCheck class="h-3 w-3" />
			</button>
		{/if}
	</div>
{/if}
