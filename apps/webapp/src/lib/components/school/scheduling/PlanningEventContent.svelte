<script lang="ts">
	import { getPlanningTimetableContext } from './planning-timetable-context';
	import { t } from '$lib/i18n';
	import { ClipboardCheck, MapPin } from '$lib/icons';

	const { event }: { event: Record<string, unknown>; mode?: string } = $props();

	const actions = getPlanningTimetableContext();

	function formatTime(value: unknown) {
		if (!(value instanceof Date))
			return '';
		return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function kindLabel(kind: unknown): string {
		switch (kind) {
			case 'homework-due':
				return $t('planning.homeworkDueLane');
			case 'activity':
				return $t('planning.eventKind.activity');
			case 'assessment':
				return $t('planning.eventKind.assessment');
			default:
				return String(event.subject ?? '');
		}
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

	const showAttendance = $derived.by(
		() => event.kind !== 'homework-due' && event.status !== 'cancelled',
	);
</script>

<div class="flex h-full min-h-0 flex-col gap-0.5 pr-6">
	<p class="font-mono text-[10px] leading-tight tracking-wide opacity-80">
		{formatTime(event.start)} – {formatTime(event.end)}
	</p>
	<p class="truncate text-xs font-semibold leading-tight">{String(event.text ?? '')}</p>
	<p class="truncate text-[11px] opacity-80">
		{kindLabel(event.kind)}
	</p>
	{#if event.teacher && event.kind !== 'homework-due'}
		<p class="truncate text-[10px] opacity-75">{String(event.teacher)}</p>
	{/if}
	{#if event.status === 'cancelled'}
		<p class="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
			{$t('planning.occurrenceStatus.cancelled')}
		</p>
	{:else if event.status === 'completed'}
		<p class="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
			{$t('planning.occurrenceStatus.completed')}
		</p>
	{/if}
	{#if event.room && event.kind !== 'homework-due'}
		<div class="mt-auto flex items-center gap-1 truncate text-[10px] opacity-75">
			<MapPin class="h-3 w-3 shrink-0" />
			<span class="truncate">{String(event.room)}</span>
		</div>
	{/if}
	{#if showAttendance}
		<button
			type="button"
			data-event-id={String(event.id ?? '')}
			title={$t('calendar.takeAttendance')}
			onclick={handleAttendance}
			class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-accent-foreground group-hover:opacity-100"
		>
			<ClipboardCheck class="h-3 w-3" />
		</button>
	{/if}
</div>
