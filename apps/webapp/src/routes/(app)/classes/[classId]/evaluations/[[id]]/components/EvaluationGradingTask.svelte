<script lang="ts">
	import type { PageLoadState } from '$lib/page/load-state';
	import type { Evaluation } from '$lib/types/school';
	import type { GradeDraft, GradeResult, MarksReview } from '../../lib/grading-task';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { ApiError } from '@maya-invest/edaya-api-client';
	import { onDestroy, untrack } from 'svelte';
	import { getEvaluationsPageState } from '../../evaluations-page.svelte';
	import { continuesGradeContext, gradeDraft, gradeEditable, gradeValues, saveGradeDraft } from '../../lib/grading-task';
	import GradeEntryGrid from './GradeEntryGrid.svelte';
	import GradeFields from './GradeFields.svelte';

	let { evaluation, panel, open = $bindable(false) }: { evaluation: Evaluation; panel: string | null; open?: boolean } = $props();
	const owner = getEvaluationsPageState();
	let review = $state<MarksReview | null>(null);
	let drafts = $state<Record<string, GradeDraft>>({});
	let baseline = $state<Record<string, GradeDraft>>({});
	const selected = $state<Record<string, boolean>>({});
	let notes = $state<Record<string, string>>({});
	let reason = $state('');
	let status = $state<PageLoadState>('loading');
	let busy = $state(false);
	let completed = $state(false);
	let halted = $state(false);
	let verification = $state<{ review: MarksReview; result: GradeResult } | null>(null);
	let failed = $state<string[]>([]);
	let confirmed = $state<string[]>([]);
	let outcome = $state('');
	let invalid = $state('');
	let scope = '';
	let mounted = true;
	let loadVersion = 0;
	const correction = $derived(panel === 'correction');
	const validTarget = $derived($page.url.searchParams.get('taskTarget') === evaluation.id && ['entry', 'correction'].includes(panel ?? '') && !$page.url.searchParams.has('taskStep'));
	const authorized = $derived(correction ? Boolean(owner.canEnterMarks(evaluation.id) && review?.allowedActions.requestCorrection && owner.grading?.review?.allowedActions.requestCorrection) : owner.canEnterMarks(evaluation.id));
	const changed = $derived(review?.students.filter(student => JSON.stringify(drafts[student.id]) !== JSON.stringify(baseline[student.id])) ?? []);
	const dirty = $derived(!completed && (correction ? Boolean(reason || Object.values(selected).some(Boolean) || changed.length || review?.results.some(row => notes[row.studentId] !== (row.notes ?? ''))) : changed.length > 0));
	const rows = $derived(review?.students.filter(student => correction
		? review!.results.some(row => row.studentId === student.id && !review!.publishedResultIds.includes(row.id))
		: gradeEditable(review!, student.id)) ?? []);
	const selectedRows = $derived(rows.filter(row => selected[row.id]));

	async function load() {
		const request = ++loadVersion;
		scope = owner.scope;
		status = 'loading';
		try {
			const next = await owner.loadMarks(evaluation.id);
			if (!mounted || request !== loadVersion || scope !== owner.scope)
				return;
			if (!next) {
				status = 'unavailable';
				return;
			}
			review = structuredClone($state.snapshot(next));
			drafts = Object.fromEntries(next.students.map(student => [student.id, gradeDraft(next.results.find(row => row.studentId === student.id))]));
			baseline = structuredClone($state.snapshot(drafts));
			notes = Object.fromEntries(next.results.map(row => [row.studentId, row.notes ?? '']));
			status = next.students.length ? 'ready' : 'empty';
		}
		catch (error) {
			if (!mounted || request !== loadVersion || scope !== owner.scope)
				return;
			status = error instanceof ApiError && [401, 403].includes(error.status) ? 'denied' : error instanceof ApiError && error.status === 404 ? 'unavailable' : 'error';
		}
	}
	$effect(() => {
		if (validTarget && status === 'loading')
			void untrack(load);
	});
	onDestroy(() => {
		mounted = false;
		loadVersion += 1;
	});

	function recorded(studentId: string) {
		const row = review?.results.find(row => row.studentId === studentId);
		if (!row)
			return $t('value.notProvided');
		if (row.designation === 'absent' || row.designation === 'exempt')
			return $t(`marks.${row.designation}`);
		if (row.originalEntry?.kind === 'mention')
			return `${row.originalEntry.code} · ${row.originalEntry.label}`;
		if (row.originalEntry?.kind === 'numeric')
			return `${row.originalEntry.value} / ${row.originalEntry.maximum}`;
		return row.score != null ? `${row.score} · ${$t('reportCards.contextUnavailable')}` : $t('dataState.unavailable');
	}
	async function refreshContext() {
		if (busy || !verification || scope !== owner.scope)
			return;
		busy = true;
		try {
			const next = await owner.loadMarks(evaluation.id);
			if (!mounted || !open || scope !== owner.scope)
				return;
			if (next && continuesGradeContext(verification.review, next, verification.result)) {
				review = next;
				verification = null;
				halted = false;
				outcome = $t('gradeTask.contextRestored');
			}
			else {
				outcome = $t('gradeTask.stopped');
			}
		}
		catch {
			if (mounted && open && scope === owner.scope)
				outcome = $t('mutation.savedRefreshFailed');
		}
		finally {
			if (mounted)
				busy = false;
		}
	}

	async function submit() {
		if (busy || !review || !authorized || !validTarget || halted || completed || scope !== owner.scope)
			return;
		const targets = correction ? selectedRows : changed;
		if (!targets.length || targets.some(row => !gradeValues(drafts[row.id], review!)) || (correction && !reason.trim())) {
			invalid = $t('gradeTask.invalid');
			return;
		}
		invalid = '';
		busy = true;
		failed = [];
		outcome = '';
		const captured = structuredClone($state.snapshot(review));
		const submitted = structuredClone($state.snapshot(drafts));
		const current = () => mounted && open && scope === owner.scope;
		try {
			if (correction) {
				const changes = targets.map(row => ({ resultId: captured.results.find(result => result.studentId === row.id)!.id, proposed: { ...gradeValues(submitted[row.id], captured)!, notes: notes[row.id]?.trim() || null } }));
				const saved = await owner.reviewMarks('request', { snapshot: captured, scope, reason, changes });
				if (current() && saved) {
					completed = true;
					outcome = $t('gradeTask.reviewSaved');
				}
			}
			else {
				const progress = await saveGradeDraft({ review: captured, drafts: submitted, baseline: structuredClone($state.snapshot(baseline)), canContinue: () => current() && owner.canEnterMarks(evaluation.id), save: (snapshot, studentId, draft) => owner.saveGrade(snapshot, studentId, draft, { scope }), onSaved: (studentId, draft) => {
					if (current()) {
						baseline = { ...baseline, [studentId]: draft };
						confirmed = [...confirmed.filter(id => id !== studentId), studentId];
					}
				} });
				if (current()) {
					failed = progress.failed;
					review = progress.review;
					halted = progress.interrupted || progress.refreshFailed;
					verification = progress.verification;
					outcome = $t('gradeTask.progress', { saved: confirmed.filter(id => JSON.stringify(drafts[id]) === JSON.stringify(baseline[id])).length, remaining: progress.remaining.length });
					if (progress.refreshFailed)
						outcome += ` ${$t('mutation.savedRefreshFailed')}`;
					if (halted)
						outcome += ` ${$t('gradeTask.stopped')}`;
				}
			}
		}
		finally {
			if (mounted)
				busy = false;
		}
	}
</script>

<FormModal presentation="task" bind:open {dirty} {busy} title={$t(correction ? 'marks.requestCorrection' : 'gradeTask.title')} onSubmit={submit}
	submitDisabled={!validTarget || status !== 'ready' || !authorized || halted || completed || !review?.gradingPolicy || review.gradingPolicy.status !== 'completed' || (correction ? !selectedRows.length : !changed.length)}>
	{#snippet navigation()}
		<div class="space-y-2 text-sm"><p class="break-words">{evaluation.title} · {evaluation.subject}</p>
			{#if correction}<p>{$t('marks.correctionHint')}</p>{:else if review}<p>{$t('gradeGrid.rosterCount', { count: rows.length })}</p>{/if}
			{#if correction && review && authorized}<p class="tabular-nums">{$t('marks.status', { state: $t(`marks.${review.assessment.marksStatus}`), revision: review.assessment.marksRevision })}</p>{/if}
		</div>
	{/snippet}
	{#if !validTarget}<DataState status="unavailable" />
	{:else if status !== 'ready'}<DataState {status} onRetry={() => void load()} />
	{:else if !authorized}<div role="status" class="space-y-4"><h2 class="text-xl font-semibold">{$t('dataState.denied')}</h2><p>{$t('gradeTask.denied')}</p></div>
	{:else if review}
		{#if outcome}<p role="status" class="mb-4 text-sm">{outcome}</p>{/if}
		{#if invalid}<p role="alert" class="mb-4 text-sm text-destructive">{invalid}</p>{/if}
		{#if !correction && review.assessment.marksStatus !== 'draft'}<p role="status">{$t('gradeTask.frozen')}</p>{/if}
		{#if review.gradingPolicy?.status !== 'completed'}<p role="status">{$t('gradeTask.policyUnavailable')}</p>{/if}
		{#if !correction && rows.length}
			<GradeEntryGrid {review} {rows} bind:drafts {baseline} {confirmed} {failed} disabled={busy || halted || completed} />
		{:else}
			<div class="space-y-6">
				{#each rows as student (student.id)}
					<fieldset disabled={busy || halted || completed} class="space-y-4 rounded-2xl border p-4">
						<legend class="break-words px-2 text-sm font-semibold">{student.firstName} {student.lastName}</legend>
						<p class="text-sm tabular-nums">{$t('gradeTask.recorded')}: {recorded(student.id)}</p>
						{#if correction}<label class="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" bind:checked={selected[student.id]} />{$t('gradeTask.include')}</label>{/if}
						{#if !correction || selected[student.id]}
							<GradeFields bind:draft={drafts[student.id]} {review} required={correction || JSON.stringify(drafts[student.id]) !== JSON.stringify(baseline[student.id])} disabled={busy || halted || completed} />
							{#if correction}<label class="block space-y-2 text-sm"><span>{$t('marks.comment')}</span><Textarea bind:value={notes[student.id]} disabled={busy || completed} /></label>{/if}
						{/if}
						{#if !correction && confirmed.includes(student.id) && JSON.stringify(drafts[student.id]) === JSON.stringify(baseline[student.id])}<p role="status" class="text-sm">{$t('gradeTask.confirmed')}</p>{:else if !correction && JSON.stringify(drafts[student.id]) !== JSON.stringify(baseline[student.id])}<p class="text-sm">{$t('gradeTask.unsaved')}</p>{/if}
						{#if failed.includes(student.id)}<p role="alert" class="text-sm text-destructive">{$t('gradeTask.failed')}</p>{/if}
					</fieldset>
				{:else}<p>{$t('gradeTask.noEditable')}</p>{/each}
				{#if correction}<label class="block space-y-2 text-sm"><span>{$t('marks.reasonRequired')}</span><Textarea bind:value={reason} required disabled={busy || completed} /></label>{/if}
			</div>
		{/if}
	{/if}
	{#snippet footer({ close, submit, busy, submitDisabled })}
		<Button variant="outline" onclick={close}>{$t('common.close')}</Button>
		{#if verification}<Button variant="outline" onclick={refreshContext} disabled={busy}>{$t('gradeTask.refresh')}</Button>{/if}
		<Button onclick={submit} aria-busy={busy} pendingLabel={$t('form.saving')} disabled={busy || submitDisabled}>{correction ? $t('marks.requestCorrection') : $t('gradeGrid.save', { count: changed.length })}</Button>
	{/snippet}
</FormModal>
