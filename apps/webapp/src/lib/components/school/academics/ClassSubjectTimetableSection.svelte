<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { School } from '$lib/types/school';
	import { updateClassSubjectTimetableMutation } from '$lib/api/mutations/class-subject.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { resolvedPeriodSpanPlaceholder } from '$lib/components/school/scheduling/timetable-placement-parameters';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';

	const {
		classSubjectId,
		school,
	}: {
		classSubjectId: string;
		school?: School | null;
	} = $props();

	type ClassSubject = components['schemas']['ClassSubject'];

	let loading = $state(true);
	let busy = $state(false);
	let classSubject = $state<ClassSubject | null>(null);
	let periodsPerWeek = $state('');
	let minPeriodSpan = $state('');
	let maxPeriodSpan = $state('');

	const spanPlaceholder = $derived(
		classSubject
			? resolvedPeriodSpanPlaceholder(classSubject, school ?? undefined)
			: { min: school?.timetableMinPeriodSpan ?? 1, max: school?.timetableMaxPeriodSpan ?? 1 },
	);

	async function loadClassSubject() {
		loading = true;
		try {
			const row = await getBrowserSchoolClient().entities.classSubjects.get(classSubjectId);
			classSubject = row;
			periodsPerWeek = row.periodsPerWeek != null ? String(row.periodsPerWeek) : '';
			minPeriodSpan = row.minPeriodSpan != null ? String(row.minPeriodSpan) : '';
			maxPeriodSpan = row.maxPeriodSpan != null ? String(row.maxPeriodSpan) : '';
		}
		finally {
			loading = false;
		}
	}

	$effect(() => {
		void classSubjectId;
		void loadClassSubject();
	});

	async function saveTimetableConfig() {
		busy = true;
		try {
			const ok = await updateClassSubjectTimetableMutation({
				classSubjectId,
				periodsPerWeek,
				minPeriodSpan,
				maxPeriodSpan,
				successMessage: $t('timetable.classSubjectTimetableSaved'),
			});
			if (ok) {
				await loadClassSubject();
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<section class="rounded-2xl border border-border bg-secondary/30 p-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<p class="text-sm font-medium">{$t('timetable.classSubjectTimetableTitle')}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('timetable.classSubjectTimetableHint')}</p>
		</div>
		<Button size="sm" class="rounded-full" disabled={busy || loading} onclick={saveTimetableConfig}>
			{$t('common.save')}
		</Button>
	</div>

	{#if loading}
		<p class="mt-3 text-xs text-muted-foreground">{$t('dataState.loading')}</p>
	{:else}
		<div class="mt-3 grid gap-3 sm:grid-cols-3">
			<label class="space-y-1 text-xs">
				<span class="text-muted-foreground">{$t('timetable.periodsPerWeek')}</span>
				<Input type="number" min="1" bind:value={periodsPerWeek} placeholder="—" />
			</label>
			<label class="space-y-1 text-xs">
				<span class="text-muted-foreground">{$t('timetable.minPeriodSpan')}</span>
				<Input
					type="number"
					min="1"
					bind:value={minPeriodSpan}
					placeholder={String(spanPlaceholder.min)}
				/>
			</label>
			<label class="space-y-1 text-xs">
				<span class="text-muted-foreground">{$t('timetable.maxPeriodSpan')}</span>
				<Input
					type="number"
					min="1"
					bind:value={maxPeriodSpan}
					placeholder={String(spanPlaceholder.max)}
				/>
			</label>
		</div>
		<p class="mt-2 text-[11px] text-muted-foreground">{$t('timetable.periodSpanPlaceholderHint')}</p>
	{/if}
</section>
