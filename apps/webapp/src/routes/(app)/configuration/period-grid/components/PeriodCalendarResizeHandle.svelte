<script lang="ts">
	import { t } from '$lib/i18n';
	import { onDestroy } from 'svelte';
	import { periodResizeEnd } from '../lib/period-calendar';
	import { getPeriodCalendarActions } from '../lib/period-calendar-context';

	const { event, label, onPreview }: { event: Record<string, unknown>; label: string; onPreview: (end: Date | null) => void } = $props();
	const actions = getPeriodCalendarActions();
	let dragging = $state(false);
	let preview = $state<Date | null>(null);
	let gesture: {
		button: HTMLButtonElement;
		card: HTMLElement;
		pointerId: number;
		startY: number;
		height: number;
		originalHeight: string;
		start: Date;
		end: Date;
	} | null = null;

	function cancel() {
		const current = gesture;
		gesture = null;
		dragging = false;
		preview = null;
		if (current) {
			onPreview(null);
			current.card.style.height = current.originalHeight;
			if (current.button.hasPointerCapture(current.pointerId))
				current.button.releasePointerCapture(current.pointerId);
		}
	}
	onDestroy(cancel);

	function startResize(e: PointerEvent) {
		if (e.button !== 0 || !actions.editable || actions.busy || gesture
			|| !(event.start instanceof Date) || !(event.end instanceof Date)) {
			return;
		}
		const button = e.currentTarget as HTMLButtonElement;
		const card = button.closest<HTMLElement>('.wx-box-event');
		if (!card)
			return;
		e.preventDefault();
		e.stopPropagation();
		gesture = { button, card, pointerId: e.pointerId, startY: e.clientY, height: card.getBoundingClientRect().height, originalHeight: card.style.height, start: event.start, end: event.end };
		dragging = true;
		onPreview(event.end);
		button.focus({ preventScroll: true });
		button.setPointerCapture(e.pointerId);
	}

	function moveResize(e: PointerEvent) {
		if (!gesture || e.pointerId !== gesture.pointerId)
			return;
		e.stopPropagation();
		preview = periodResizeEnd(gesture.start, gesture.end, gesture.height, e.clientY - gesture.startY);
		if (preview && +preview > +gesture.start) {
			onPreview(preview);
			const scale = (gesture.height + 1) / (+gesture.end - +gesture.start);
			gesture.card.style.height = `${Math.max(3, (+preview - +gesture.start) * scale - 1)}px`;
		}
	}

	function finishResize(e: PointerEvent) {
		if (!gesture || e.pointerId !== gesture.pointerId)
			return;
		e.stopPropagation();
		const end = preview;
		const changed = end !== null && +end !== +gesture.end;
		cancel();
		if (changed && end)
			actions.resize(String(event.id), end);
	}

	function resizeKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			cancel();
		}
		else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && event.end instanceof Date && !dragging) {
			e.preventDefault();
			e.stopPropagation();
			actions.resize(String(event.id), new Date(+event.end + (e.key === 'ArrowDown' ? 5 : -5) * 60000));
		}
	}
</script>

<button
	type="button"
	class="period-resize absolute bottom-0 left-1/2 z-10 flex h-2 w-7 -translate-x-1/2 touch-none cursor-ns-resize items-center justify-center rounded-sm text-muted-foreground hover:bg-card focus-visible:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
	class:resizing={dragging}
	aria-label={`${$t('periodDefinitions.resizeHandle')} · ${label}`}
	title={$t('periodDefinitions.resizeHelp')}
	disabled={actions.busy}
	onpointerdown={startResize}
	onpointermove={moveResize}
	onpointerup={finishResize}
	onpointercancel={cancel}
	onlostpointercapture={cancel}
	onmousedown={e => e.stopPropagation()}
	onclick={e => e.stopPropagation()}
	onkeydown={resizeKey}
>
	<span class="h-0.5 w-4 rounded-full bg-current" aria-hidden="true"></span>
</button>

<style>
	.period-resize { opacity: 0.45; }
	.period-resize:hover, .period-resize:focus-visible, .resizing { opacity: 1; }
</style>
