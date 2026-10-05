<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { AttendanceStep } from '../planning-surface';
	import { afterNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, X, Clock, ArrowLeft, RotateCcw } from '$lib/icons';
	import { cn } from '$lib/utils';

	type Status = 'present' | 'absent' | 'late';

	const {
		open,
		step,
		onStepChange,
		onClose,
		students,
		className,
		classLevel,
	}: {
		open: boolean;
		step: AttendanceStep;
		onStepChange: (step: AttendanceStep, replace?: boolean) => void;
		onClose: () => void;
		students: Student[];
		className: string;
		classLevel: string;
	} = $props();

	const AVATAR_TINTS = [
		'bg-primary text-primary-foreground',
		'bg-primary/80 text-primary-foreground',
		'bg-primary/60 text-primary-foreground',
		'bg-success text-success-foreground',
	];

	let marks = $state<Record<string, Status>>({});
	let index = $state(0);

	const total = $derived(students.length);
	const checked = $derived(Object.keys(marks).length);
	const progress = $derived(total === 0 ? 0 : Math.round((checked / total) * 100));
	const done = $derived(checked === total && total > 0);
	const current = $derived(students[index]);

	const counts = $derived.by(() => {
		const c = { present: 0, absent: 0, late: 0 } as Record<Status, number>;
		Object.values(marks).forEach(m => (c[m] += 1));
		return c;
	});

	const statusMeta = $derived({
		present: {
			label: $t('attendance.present'),
			pill: 'bg-secondary text-foreground/80',
		},
		absent: {
			label: $t('attendance.absent'),
			pill: 'bg-highlight-soft text-destructive',
		},
		late: {
			label: $t('attendance.late'),
			pill: 'bg-highlight-soft text-highlight',
		},
	} satisfies Record<Status, { label: string; pill: string }>);

	function setStatus(s: Status) {
		if (!current)
			return;
		const nextMarks = { ...marks, [current.id]: s };
		marks = nextMarks;
		if (Object.keys(nextMarks).length === total && total > 0) {
			onStepChange('review');
		}
		else if (index < total - 1) {
			index += 1;
		}
	}

	function reset() {
		marks = {};
		index = 0;
	}

	function startOver() {
		reset();
		onStepChange('mark');
	}

	afterNavigate(() => {
		if (open && step === 'review' && !done) {
			onStepChange('mark', true);
		}
	});

	const statusKeys = ['present', 'absent', 'late'] as const;
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center bg-foreground/40 px-4 backdrop-blur-sm"
	>
		<div
			class="relative flex h-[min(820px,92vh)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-border bg-[hsl(220_30%_10%)] text-primary-foreground shadow-panel"
		>
			<div class="shrink-0 px-6 pb-5 pt-6">
				<div class="mb-4 flex items-center justify-between">
					<button
						type="button"
						onclick={onClose}
						class="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-primary-foreground/70 transition hover:bg-white/10"
						aria-label={$t('attendance.close')}
					>
						<ArrowLeft class="h-4 w-4" />
					</button>
					<span class="font-sans tabular-nums text-[11px] uppercase tracking-widest text-primary-foreground/50">
						{classLevel}
					</span>
				</div>

				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<h2 class="truncate font-display text-2xl font-semibold">{className}</h2>
						<p class="text-sm text-primary-foreground/60">{$t('attendance.live')}</p>
					</div>
					<span class="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
						{new Date().toLocaleDateString($locale, { weekday: 'short' })} ·
						{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</span>
				</div>

				<div class="mt-5">
					<div
						class="mb-1.5 flex items-center justify-between font-sans tabular-nums text-[11px] text-primary-foreground/60"
					>
						<span>{$t('attendance.checked', { c: checked, t: total })}</span>
						<span>{progress}%</span>
					</div>
					<div class="h-1 w-full overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-accent transition-all duration-500"
							style:width="{progress}%"
						></div>
					</div>
				</div>
			</div>

			<div class="flex min-h-0 flex-1 flex-col bg-[hsl(220_28%_8%)] px-6 py-6">
				{#if step === 'mark' && current}
					<div class="flex flex-1 animate-fade-in flex-col items-center justify-center">
						<div
							class="w-full rounded-3xl border border-white/5 bg-white/[0.03] px-8 py-10 text-center"
						>
							<div
								class={cn(
									'mx-auto flex h-24 w-24 items-center justify-center rounded-full font-display text-3xl font-semibold text-primary',
									AVATAR_TINTS[index % AVATAR_TINTS.length],
								)}
							>
								{current.initials}
							</div>
							<h3 class="mt-5 font-display text-2xl font-semibold">{current.name}</h3>
							<p
								class="mt-1 font-sans tabular-nums text-xs uppercase tracking-widest text-primary-foreground/50"
							>
								STU-{current.id.toUpperCase().padStart(4, '0')}
							</p>

							<div class="mt-6 flex items-center justify-center gap-1.5">
								{#each students as s, i (s.id)}
									<span
										class={cn(
											'h-1.5 rounded-full transition-all',
											i === index
												? 'w-5 bg-accent'
												: marks[s.id]
												? 'w-1.5 bg-accent/60'
												: 'w-1.5 bg-white/15',
										)}
									></span>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				{#if step === 'review' && done}
					<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
						<div class="shrink-0 text-center">
							<h3 class="font-display text-2xl font-semibold">{$t('attendance.complete')}</h3>
							<p class="mt-1 text-sm text-primary-foreground/60">
								{className} · {new Date().toLocaleDateString($locale, { weekday: 'long' })}
							</p>
						</div>

						<div class="mt-5 grid shrink-0 grid-cols-3 gap-3">
							<div
								class="rounded-2xl bg-secondary px-3 py-4 text-center text-primary"
							>
								<p class="font-display text-3xl font-semibold leading-none">{counts.present}</p>
								<p
									class="mt-1.5 text-[11px] font-medium uppercase tracking-wider opacity-80"
								>
									{$t('attendance.present')}
								</p>
							</div>
							<div
								class="rounded-2xl bg-highlight-soft px-3 py-4 text-center text-destructive"
							>
								<p class="font-display text-3xl font-semibold leading-none">{counts.absent}</p>
								<p
									class="mt-1.5 text-[11px] font-medium uppercase tracking-wider opacity-80"
								>
									{$t('attendance.absent')}
								</p>
							</div>
							<div
								class="rounded-2xl bg-[hsl(48_90%_88%)] px-3 py-4 text-center text-[hsl(35_80%_30%)]"
							>
								<p class="font-display text-3xl font-semibold leading-none">{counts.late}</p>
								<p
									class="mt-1.5 text-[11px] font-medium uppercase tracking-wider opacity-80"
								>
									{$t('attendance.late')}
								</p>
							</div>
						</div>

						<ul class="scrollbar-thin mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
							{#each students as s, i (s.id)}
								{@const status = marks[s.id]}
								{#if status}
									{@const meta = statusMeta[status]}
									<li
										class="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5"
									>
										<div class="flex min-w-0 items-center gap-3">
											<div
												class={cn(
													'flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-semibold text-primary',
													AVATAR_TINTS[i % AVATAR_TINTS.length],
												)}
											>
												{s.initials}
											</div>
											<span class="truncate text-sm font-medium">{s.name}</span>
										</div>
										<span
											class={cn(
												'rounded-full px-2.5 py-1 text-[11px] font-medium',
												meta.pill,
											)}
										>
											{meta.label}
										</span>
									</li>
								{/if}
							{/each}
						</ul>

						<Button
							onclick={startOver}
							variant="secondary"
							class="mt-4 h-11 w-full shrink-0 rounded-full bg-white/5 text-primary-foreground hover:bg-white/10"
						>
							<RotateCcw class="mr-2 h-4 w-4" />
							{$t('attendance.startOver')}
						</Button>
					</div>
				{/if}
			</div>

			{#if step === 'mark' && current}
				<div
					class="grid shrink-0 grid-cols-3 gap-2 border-t border-white/5 bg-[hsl(220_28%_8%)] p-4"
				>
					{#each statusKeys as statusKey (statusKey)}
						{@const meta = statusMeta[statusKey]}
						<button
							type="button"
							onclick={() => setStatus(statusKey)}
							class={cn(
								'flex flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium transition-all active:scale-[0.97]',
								statusKey === 'present' && 'hover:border-accent/40 hover:bg-accent/20',
								statusKey === 'absent' && 'hover:border-destructive/40 hover:bg-destructive/20',
								statusKey === 'late' && 'hover:border-highlight/40 hover:bg-highlight/20',
							)}
						>
							{#if statusKey === 'present'}
								<Check class="h-5 w-5" />
							{:else if statusKey === 'absent'}
								<X class="h-5 w-5" />
							{:else}
								<Clock class="h-5 w-5" />
							{/if}
							{meta.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
