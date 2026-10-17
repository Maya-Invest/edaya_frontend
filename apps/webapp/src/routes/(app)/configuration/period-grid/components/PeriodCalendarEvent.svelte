<script lang="ts">
	import { t } from '$lib/i18n';
	import { Pencil, Trash2 } from '$lib/icons';
	import { periodMovePreview } from '../lib/period-calendar';
	import { getPeriodCalendarActions } from '../lib/period-calendar-context';
	import { PERIOD_DEFINITION_WEEKDAY_LABEL_KEY } from '../lib/period-definition-presets';
	import PeriodCalendarResizeHandle from './PeriodCalendarResizeHandle.svelte';

	const { event }: { event: Record<string, unknown> } = $props();
	const actions = getPeriodCalendarActions();
	let previewEnd = $state<Date | null>(null);
	let movePreview = $state<{ start: Date; end: Date } | null>(null);
	const previewing = $derived(previewEnd !== null || movePreview !== null);
	const displayedStart = $derived(movePreview?.start ?? event.start);
	const displayedEnd = $derived(previewEnd ?? movePreview?.end ?? event.end);
	const compactPreview = $derived(previewing && displayedStart instanceof Date && displayedEnd instanceof Date && +displayedEnd - +displayedStart < 30 * 60000);
	const selected = $derived(actions.selectedId === String(event.id));
	const weekday = $derived(PERIOD_DEFINITION_WEEKDAY_LABEL_KEY[event.dayOfWeek as keyof typeof PERIOD_DEFINITION_WEEKDAY_LABEL_KEY]);
	// Observe SVAR's native card movement without intercepting its drag/save lifecycle.
	function previewMove(node: HTMLElement) {
		const card = node.closest<HTMLElement>('.wx-box-event');
		if (!card)
			return;
		let origin: { top: number; height: number; start: Date; end: Date } | null = null;
		function rememberOrigin() {
			origin = event.start instanceof Date && event.end instanceof Date
				? { top: Number.parseFloat(card!.style.top), height: Number.parseFloat(card!.style.height), start: event.start, end: event.end }
				: null;
		}
		const observer = new MutationObserver(() => {
			if (!card.classList.contains('wx-dragging')) {
				movePreview = null;
				return;
			}
			if (origin) {
				movePreview = periodMovePreview(origin.start, origin.end, origin.height, Number.parseFloat(card.style.top) - origin.top);
			}
		});
		card.addEventListener('mousedown', rememberOrigin, true);
		observer.observe(card, { attributes: true, attributeFilter: ['style', 'class'] });
		return { destroy() {
			observer.disconnect();
			card.removeEventListener('mousedown', rememberOrigin, true);
			movePreview = null;
		} };
	}
	function time(value: unknown) {
		return value instanceof Date ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : '';
	}
</script>

<div use:previewMove class="period-event flex h-full min-h-0 flex-wrap items-center gap-x-2 overflow-hidden px-1" data-period-id={String(event.id)} data-selected={selected} data-resizing={previewEnd !== null} data-moving={movePreview !== null}>
	<span class:hidden={compactPreview} title={String(event.text ?? '')} class={`period-label w-full truncate ${event.isBreak ? 'text-xs' : 'text-sm font-medium'}`}>{String(event.text ?? '')}</span>
	<span class="period-time font-sans text-xs tabular-nums" class:font-semibold={previewing}>{time(displayedStart)}–{time(displayedEnd)}</span>
	{#if actions.editable}
		<button
			type="button"
			class="period-action absolute right-7 top-0 flex h-6 w-6 items-center justify-center rounded border border-border bg-card text-foreground shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
			aria-label={`${$t('common.edit')} · ${weekday ? $t(weekday) : ''} · ${String(event.text ?? '')} · ${time(event.start)}–${time(event.end)}`}
			title={$t('common.edit')}
			disabled={actions.busy}
			onmousedown={e => e.stopPropagation()}
			onclick={(e) => {
				e.stopPropagation();
				actions.edit(String(event.id));
			}}
		>
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button
			type="button"
			class="period-action absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded border border-border bg-card text-destructive shadow-sm hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
			aria-label={`${$t('common.delete')} · ${weekday ? $t(weekday) : ''} · ${String(event.text ?? '')} · ${time(event.start)}–${time(event.end)}`}
			title={$t('common.delete')}
			disabled={actions.busy}
			onmousedown={e => e.stopPropagation()}
			onclick={(e) => {
				e.stopPropagation();
				actions.remove(String(event.id));
			}}
		>
			<Trash2 class="h-3.5 w-3.5" />
		</button>
		<PeriodCalendarResizeHandle {event} onPreview={end => previewEnd = end} label={`${weekday ? $t(weekday) : ''} · ${String(event.text ?? '')} · ${time(event.start)}–${time(displayedEnd)}`} />
	{/if}
</div>

<style>
	.period-action { opacity: 0; }
	.period-event[data-moving='true'] .period-action,
	.period-event[data-resizing='true'] .period-action { visibility: hidden; }
	.period-event:hover .period-label,
	.period-event:focus-within .period-label,
	.period-event[data-selected='true'] .period-label { padding-right: 2.75rem; }
	.period-event:hover .period-action,
	.period-event:focus-within .period-action,
	.period-event[data-selected='true'] .period-action { opacity: 1; }
	:global(.period-calendar .wx-box-event:has(.period-event[data-selected='true'])) {
		outline: 2px solid hsl(var(--primary));
		outline-offset: -2px;
	}
	@media (hover: none) {
		.period-action { opacity: 1; }
		.period-label { padding-right: 2.75rem; }
	}
</style>
