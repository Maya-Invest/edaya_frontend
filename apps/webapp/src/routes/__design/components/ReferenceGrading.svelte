<script lang="ts">
	import type { GradeDraft, GradeEntryPolicy, GradeResult, MarksReview } from '../../(app)/classes/[classId]/evaluations/lib/grading-task';
	import type { ReferenceCopy } from '../reference-copy';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import GradeEntryGrid from '../../(app)/classes/[classId]/evaluations/[[id]]/components/GradeEntryGrid.svelte';
	import GradeResultValue from '../../(app)/classes/[classId]/evaluations/[[id]]/components/GradeResultValue.svelte';
	import { gradeValues } from '../../(app)/classes/[classId]/evaluations/lib/grading-task';

	const captured: GradeResult = { id: 'reference', studentId: 'reference', assessmentId: 'reference', revision: 1, score: 15.25, designation: 'scored', originalEntry: { kind: 'numeric', value: 15.25, maximum: 20 }, calculation: { policyRevision: 1, scaleId: 'reference', scaleRevision: 1, mode: 'numeric-first', maximum: 20, decimalPlaces: 2, roundingMode: 'nearest', units: 'numeric', value: 15.25, reportedValue: 15.25, mention: { id: 'a', code: 'A', label: 'Excellent' }, provenance: 'numeric-normalization' } };
	const { copy }: { copy: ReferenceCopy } = $props();
	let open = $state(false);
	let mention = $state(false);
	let saved = $state(false);
	const roster = Array.from({ length: 30 }, (_, i) => ({ id: `reference-${i}`, firstName: ['Aminata', 'Binta', 'Cheikh', 'Diarra', 'Fatou'][i % 5]!, lastName: `${['Koné', 'Diabaté', 'Diallo', 'Traoré', 'Diop'][i % 5]} ${i + 1}` }));
	let drafts = $state<Record<string, GradeDraft>>({});
	let baseline = $state<Record<string, GradeDraft>>({});
	let confirmed = $state<string[]>([]);
	const changed = $derived(roster.filter(row => JSON.stringify(drafts[row.id]) !== JSON.stringify(baseline[row.id])));
	const policy = $derived<GradeEntryPolicy>({ assessment: { maxScore: 20 }, gradingPolicy: {
		academicYearId: 'reference',
		revision: 1,
		mode: mention ? 'mention-first' : 'numeric-first',
		aggregateLabel: 'Reference',
		status: 'completed',
		numericEquivalents: {},
		scale: { id: 'reference', schoolId: 'reference', name: 'Reference', minScore: 0, maxScore: 20, decimalPlaces: 2, roundingMode: 'nearest', intervalConvention: 'continuous', revision: 1, isDefault: true, ranges: [{ id: 'a', letter: 'A', interpretation: 'Excellent', minScore: 15, maxScore: 20, gpaValue: 4 }, { id: 'b', letter: 'B', interpretation: 'Bien / Good', minScore: 10, maxScore: 15, gpaValue: 3 }] },
	} });
	const review = $derived<MarksReview>({ assessment: { id: 'reference', classGroupId: 'reference', classSubjectId: 'reference', periodId: 'reference', title: 'Reference', kind: 'quiz', maxScore: 20, coefficient: 1, attachments: [], marksStatus: 'draft', marksRevision: 1, marksReview: { rosterStudentIds: roster.map(row => row.id), markEditorSubjectIds: {}, editedBySubjectIds: [], history: [] } }, gradingPolicy: policy.gradingPolicy, students: roster, results: [], missingStudentIds: roster.map(row => row.id), publishedResultIds: [], corrections: [], allowedActions: { submit: false, requestCorrection: false } });
	function launch(mentions: boolean) {
		mention = mentions;
		drafts = Object.fromEntries(roster.map(row => [row.id, { score: '', mentionId: '', designation: 'scored' }]));
		baseline = structuredClone($state.snapshot(drafts));
		confirmed = [];
		saved = false;
		open = true;
	}
</script>
<Button variant="outline" onclick={() => launch(false)}>{$t('gradeTask.title')} · {$t('marks.scored')}</Button>
<Button variant="outline" onclick={() => launch(true)}>{$t('gradeTask.title')} · {$t('grading.mention')}</Button>
<FormModal presentation="task" bind:open title={$t('gradeTask.title')} description={copy.taskHint} dirty={changed.length > 0} onSubmit={() => {
	if (changed.length && changed.every(row => gradeValues(drafts[row.id], policy))) {
		confirmed = [...confirmed, ...changed.map(row => row.id)];
		baseline = structuredClone($state.snapshot(drafts));
		saved = true;
	}
}}>
	{#snippet navigation()}<p class="text-sm">{$t('gradeGrid.saveHint')}</p>{/snippet}
	{#if saved}<p role="status" class="mb-4 text-sm">{copy.saved}</p>{/if}
	<GradeEntryGrid {review} rows={roster} bind:drafts {baseline} {confirmed} failed={[]} />
	{#snippet footer({ close, submit })}<Button variant="outline" onclick={close}>{copy.close}</Button><Button onclick={submit} disabled={!changed.length}>{$t('gradeGrid.save', { count: changed.length })}</Button>{/snippet}
</FormModal>

<div class="grid w-full gap-4 border border-border p-4 sm:grid-cols-2">
	<section class="space-y-2"><h3 class="text-sm font-semibold">{$t('gradeInspection.original')}</h3><GradeResultValue result={captured} mode="original" /></section>
	<section class="space-y-2"><h3 class="text-sm font-semibold">{$t('gradeTask.recorded')}</h3><GradeResultValue result={captured} mode="captured" /></section>
	<section class="space-y-2"><h3 class="text-sm font-semibold">{$t('marks.absent')}</h3><GradeResultValue result={{ ...captured, designation: 'absent' }} mode="captured" /></section>
	<section class="space-y-2"><h3 class="text-sm font-semibold">{$t('dataState.unavailable')}</h3><GradeResultValue result={{ ...captured, calculation: undefined }} mode="captured" /></section>
</div>
