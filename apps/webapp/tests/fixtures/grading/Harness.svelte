<script lang="ts">
	import type { Evaluation } from '../../../src/lib/types/school';
	import ConfirmModal from '../../../src/lib/components/ui/ConfirmModal.svelte';
	import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
	import { setLang, t } from '../../../src/lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '../../../src/lib/modal/modal-state.svelte';
	import { TASK_QUERY_KEYS } from '../../../src/lib/modal/modal-url';
	import { EvaluationsPageState, setEvaluationsPageState } from '../../../src/routes/(app)/classes/[classId]/evaluations/evaluations-page.svelte';
	import { EvaluationGradingTabState, setEvaluationGradingTabState } from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/(tabs)/grading/evaluation-grading-tab.svelte';
	import EvaluationGradeEntryModal from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/components/EvaluationGradeEntryModal.svelte';
	import EvaluationGradingTask from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/components/EvaluationGradingTask.svelte';
	import { onMount } from 'svelte';
	import EvaluationGradingTab from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/(tabs)/grading/components/EvaluationGradingTab.svelte';
	import MarksReview from '../../../src/routes/(app)/classes/[classId]/evaluations/[[id]]/(tabs)/grading/components/MarksReview.svelte';
	import { controls, page, server } from './environment.svelte';
	const inspect = new URL(location.href).searchParams.has('inspect');
	onMount(() => { if (inspect) void owner.loadMarks('assessment'); });
	let bounded = $state(false);
	let refreshed = $state(false);
	const dirtyWork = provideDirtyWork();
	setLang(new URL(location.href).searchParams.get('lang') === 'fr' ? 'fr' : 'en');
	const owner = new EvaluationsPageState(() => $page.url);
	const grading = new EvaluationGradingTabState(); owner.attachGrading(grading); setEvaluationGradingTabState(grading); setEvaluationsPageState(owner);
	const evaluation = { id: 'assessment', classId: 'class', classSubjectId: 'subject', title: 'Algebra · Class A', kind: 'quiz', subject: 'Mathematics', outOf: 20 } as Evaluation;
	owner.seed('class', { evaluations: [evaluation] });
	const tasks = createUrlSyncedModals({ getUrl: () => $page.url, allowed: ['grade-entry'], queryKeys: TASK_QUERY_KEYS, allowedTabs: ['entry', 'correction'] });
	const open = bindUrlModal(tasks, 'grade-entry');
	$effect(() => tasks.hydrate());
	async function openBounded() {
		await owner.loadMarks('assessment');
		bounded = true;
		setTimeout(() => {
			server.results[0]!.score = 17;
			server.assessment.marksRevision++;
			owner.seed('class', { evaluations: [{ ...evaluation }] });
			grading.adopt('class', structuredClone(server));
			refreshed = true;
		}, 10000);
	}
</script>
<div class="p-6"><h1>Disposable grading fixture</h1><button onclick={openBounded}>Open bounded grade with delayed refresh</button><output>{refreshed ? 'Server refreshed' : ''}</output><button onclick={() => tasks.open('grade-entry', { target: 'assessment', tab: 'entry' })}>Open entry</button><button onclick={() => controls.allowed = !controls.allowed}>Permission</button><output data-testid="requests">{JSON.stringify(controls.requests)}</output></div>
{#if open.open}{#key `${owner.scope}|${tasks.tab}`}<EvaluationGradingTask {evaluation} panel={tasks.tab} bind:open={open.open} />{/key}{/if}
<ConfirmModal open={dirtyWork.pending !== null} title={$t('form.discardTitle')} description={$t('form.discardDescription')}
	confirmLabel={$t('form.discard')} cancelLabel={$t('form.keepEditing')} variant="destructive"
	onOpenChange={value => { if (!value) dirtyWork.cancel(); }} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />

{#if bounded && owner.selected && grading.studentsFor('class')[0]}<EvaluationGradeEntryModal evaluation={owner.selected} student={grading.studentsFor('class')[0]!} existingScore={grading.scoreFor('assessment', 's1')} bind:open={bounded} />{/if}

{#if inspect && grading.review}<main class="mx-auto max-w-5xl space-y-6 p-6"><EvaluationGradingTab {evaluation} classId="class" /><MarksReview /></main>{/if}
