<script lang="ts">
	import type { TimetableSetupTab } from '../../../src/routes/(app)/configuration/tools/components/TimetableGenerationSetupTabs.svelte';
	import type { TimetableGenerationStep } from '../../../src/routes/(app)/configuration/tools/lib/tools-workflow';
	import type { TimetablePlanningPageState } from '../../../src/routes/(app)/configuration/tools/timetable-planning-page.svelte';
	import ConfirmModal from '../../../src/lib/components/ui/ConfirmModal.svelte';
	import { setLang, t } from '../../../src/lib/i18n';
	import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
	import SchoolTimetableGenerationModal from '../../../src/routes/(app)/configuration/tools/components/SchoolTimetableGenerationModal.svelte';
	import { academicContext } from './academic-context.svelte';

	const dirtyWork = provideDirtyWork();
	let open = $state(true);
	let phase = $state<TimetableGenerationStep>('setup');
	let setupTab = $state<TimetableSetupTab>('subjects');
	const requests = $state<unknown[]>([]);
	let finish = () => {};
	let failNext = false;
	const planning = $state({
		get classes() { return academicContext.classes; },
		get range() { return { startDate: '2026-09-07', endDate: '2026-09-11' }; },
		canGenerateSchoolInitial: true,
		get classSubjects() { return academicContext.classes.map(({ id }) => ({ id: `subject-${id}`, classGroupId: id, subjectId: 'math', periodsPerWeek: 2, isOffered: true })); },
		subjectLabels: { math: 'Mathematics' },
		teacherLabelsByClassSubjectId: {},
		generationPhase: 'idle',
		busy: false,
		async generate(input: { classGroupIds: string[] }) {
			requests.push(input);
			planning.generationPhase = 'generating';
			planning.busy = true;
			await new Promise<void>((resolve) => {
				finish = resolve;
			});
			planning.busy = false;
			if (failNext) { failNext = false; return { ok: false, error: { summary: 'Generation failed', guidanceKeys: [] } }; }
			return { ok: true, value: { academicYearId: academicContext.yearId, skippedClassGroupIds: [], classGroups: input.classGroupIds.map(classGroupId => ({ classGroupId, sessions: [], placements: [], unmetWorkloads: [] })) } };
		},
	});
</script>

<button data-testid="fixture-open" onclick={() => {
	open = true;
	phase = 'setup';
}}>Open</button>
<button data-testid="fixture-finish-later" onclick={() => { setTimeout(finish, 1500); }}>Finish in 1.5 seconds</button>
<button data-testid="fixture-result" onclick={() => {
	open = true;
	phase = 'success';
}}>Open result address</button>
<button data-testid="fixture-refresh" onclick={() => { planning.generationPhase = 'refreshing'; }}>Refreshing</button>
<button data-testid="fixture-fail" onclick={() => { failNext = true; finish(); }}>Fail</button>
<button data-testid="fixture-finish" onclick={() => finish()}>Finish</button>
<button data-testid="fixture-year" onclick={() => {
	academicContext.yearId = 'other-year';
	academicContext.classes = [{ ...academicContext.classes[0]!, id: 'other-class', academicYearId: 'other-year' }];
}}>Change year</button>
<button data-testid="fixture-school" onclick={() => { academicContext.schools = [{ ...academicContext.schools[0]!, id: 'other-school' }]; }}>Change school</button>
<button data-testid="fixture-empty" onclick={() => { academicContext.classes = []; }}>No classes</button>
<button data-testid="fixture-many" onclick={() => {
	const template = academicContext.classes[0]!;
	academicContext.classes = Array.from({ length: 80 }, (_, index) => ({ ...template, id: `many-${index}`, name: index === 0 ? 'Classe internationale — parcours bilingue français et anglais' : `Classe ${String(index + 1).padStart(2, '0')}`, gradeLevelId: index < 40 ? 'grade-1' : 'grade-2', academicYearId: 'many-year' }));
	academicContext.yearId = 'many-year';
}}>Many classes</button>
<button data-testid="fixture-fr" onclick={() => setLang('fr')}>French</button>
<button data-testid="fixture-en" onclick={() => setLang('en')}>English</button>
<pre data-testid="fixture-requests">{JSON.stringify(requests)}</pre>
<SchoolTimetableGenerationModal bind:open state={planning as unknown as TimetablePlanningPageState} {phase} {setupTab}
	onPhaseChange={(next) => { phase = next; }}
	onSetupTabChange={(next) => { setupTab = next; }}
	onInvalidPhase={(next) => { phase = next; }} />

<ConfirmModal open={dirtyWork.pending !== null} title={$t('form.discardTitle')} description={$t('form.discardDescription')}
	confirmLabel={$t('form.discard')} cancelLabel={$t('form.keepEditing')} variant="destructive"
	onOpenChange={(value) => {
		if (!value)
			dirtyWork.cancel();
	}} onConfirm={() => dirtyWork.discard()} onCancel={() => dirtyWork.cancel()} />
