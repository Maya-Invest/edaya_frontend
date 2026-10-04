<script lang="ts">
	import type {
		ImportWorkflowStep,
		TimetableGenerationStep,
		TimetablePublishStep,
	} from '../lib/tools-workflow';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import DataImportModal from '$lib/components/school/configuration/DataImportModal.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, GraduationCap, Upload } from '$lib/icons';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { appPath } from '$lib/navigation/app-navigation';
	import {
		IMPORT_TYPE_TABS,
		IMPORT_WORKFLOW_STEPS,
		TIMETABLE_GENERATION_STEPS,
		TIMETABLE_PUBLISH_STEPS,
		TIMETABLE_SETUP_TABS,
	} from '../lib/tools-workflow';
	import { getToolsPageState } from '../tools-page.svelte';
	import SchoolTimetableGenerationModal from './SchoolTimetableGenerationModal.svelte';
	import SchoolTimetablePublishModal from './SchoolTimetablePublishModal.svelte';

	const toolsPage = getToolsPageState();
	const modals = toolsPage.modals;
	const importOpen = bindUrlModal(modals, 'import');
	const generationOpen = bindUrlModal(modals, 'generate-timetable');
	const publishOpen = bindUrlModal(modals, 'publish-timetable');
	const teacherAssignmentsHref = appPath('/(app)/configuration/tools/teacher-assignments');

	const importStep = $derived(
		IMPORT_WORKFLOW_STEPS.includes(modals.step as ImportWorkflowStep)
			? modals.step as ImportWorkflowStep
			: 'download',
	);
	const importType = $derived(
		IMPORT_TYPE_TABS.includes(modals.tab as (typeof IMPORT_TYPE_TABS)[number])
			? modals.tab as (typeof IMPORT_TYPE_TABS)[number]
			: toolsPage.defaultImportTab,
	);
	const generationStep = $derived(
		TIMETABLE_GENERATION_STEPS.includes(modals.step as TimetableGenerationStep)
			? modals.step as TimetableGenerationStep
			: 'setup',
	);
	const generationTab = $derived(
		TIMETABLE_SETUP_TABS.includes(modals.tab as (typeof TIMETABLE_SETUP_TABS)[number])
			? modals.tab as (typeof TIMETABLE_SETUP_TABS)[number]
			: 'subjects',
	);
	const publishStep = $derived(
		TIMETABLE_PUBLISH_STEPS.includes(modals.step as TimetablePublishStep)
			? modals.step as TimetablePublishStep
			: 'setup',
	);
</script>

<ListPageHeader
	eyebrow={$t('tools.eyebrow')}
	title={$t('tools.title')}
	description={$t('tools.description')}
/>

<div class="grid gap-4 md:grid-cols-2 xl:max-w-4xl">
	<article
		class="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
		data-testid="import-pack-generic"
	>
		<div class="mb-4 flex items-start gap-3">
			<div class="rounded-lg bg-primary/10 p-2 text-primary">
				<Upload class="size-5" aria-hidden="true" />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="font-display text-lg font-semibold">{$t('import.card.title')}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{$t('import.card.description')}</p>
				<p class="mt-2 text-sm text-muted-foreground">{$t('import.recommendedOrder')}</p>
			</div>
		</div>

		<dl class="mb-5 space-y-2 text-sm">
			<div>
				<dt class="font-medium text-foreground">{$t('import.formats')}</dt>
			</div>
		</dl>

		<div class="mt-auto">
			<Button
				onclick={() => modals.open('import', {
					step: 'download',
					tab: toolsPage.defaultImportTab,
				})}
				data-testid="import-action"
			>
				{$t('import.card.action')}
			</Button>
		</div>
	</article>

	<PermissionGate permission="STAFF_UPDATE" mode="hide">
		<article
			class="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
			data-testid="teacher-assignments-tool"
		>
			<div class="mb-4 flex items-start gap-3">
				<div class="rounded-lg bg-primary/10 p-2 text-primary">
					<GraduationCap class="size-5" aria-hidden="true" />
				</div>
				<div class="min-w-0 flex-1">
					<h3 class="font-display text-lg font-semibold">
						{$t('tools.teacherAssignments.card.title')}
					</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						{$t('tools.teacherAssignments.card.description')}
					</p>
				</div>
			</div>

			<div class="mt-auto">
				<a
					href={teacherAssignmentsHref}
					class={buttonVariants()}
					data-testid="teacher-assignments-action"
				>
					{$t('tools.teacherAssignments.card.action')}
				</a>
			</div>
		</article>
	</PermissionGate>

	<PermissionGate permission="TIMETABLE_UPDATE" mode="hide">
		<article
			class="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
			data-testid="timetable-planning-tool"
		>
			<div class="mb-4 flex items-start gap-3">
				<div class="rounded-lg bg-primary/10 p-2 text-primary">
					<CalendarRange class="size-5" aria-hidden="true" />
				</div>
				<div class="min-w-0 flex-1">
					<h3 class="font-display text-lg font-semibold">{$t('tools.timetablePlanning.card.title')}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{$t('tools.timetablePlanning.card.description')}</p>
				</div>
			</div>

			<div class="mb-4"><AcademicPeriodSelector /></div>
			<div class="mt-auto flex flex-wrap gap-2">
				<Button
					onclick={() => modals.open('generate-timetable', { step: 'setup', tab: 'subjects' })}
					data-testid="timetable-planning-action"
				>
					{$t('tools.timetablePlanning.card.action')}
				</Button>
				<Button
					variant="outline"
					disabled={!toolsPage.planningPage.classes[0]}
					onclick={() => modals.open('publish-timetable', { step: 'setup' })}
					data-testid="timetable-publish-action"
				>
					{$t('tools.timetablePlanning.publishAction')}
				</Button>
			</div>
		</article>
	</PermissionGate>
</div>

<DataImportModal
	bind:open={importOpen.open}
	step={importStep}
	importType={importType}
	onStepChange={step => modals.setStep(step)}
	onImportTypeChange={tab => modals.setTab(tab)}
	onInvalidStep={step => toolsPage.replaceWorkflowStep(step)}
/>
<SchoolTimetableGenerationModal
	bind:open={generationOpen.open}
	state={toolsPage.planningPage}
	phase={generationStep}
	setupTab={generationTab}
	onPhaseChange={step => modals.setStep(step)}
	onSetupTabChange={tab => modals.setTab(tab)}
	onInvalidPhase={step => toolsPage.replaceWorkflowStep(step)}
/>
{#if toolsPage.planningPage.classes[0]}
	<SchoolTimetablePublishModal
		bind:open={publishOpen.open}
		state={toolsPage.planningPage}
		classGroupId={toolsPage.planningPage.classes[0].id}
		className={toolsPage.planningPage.classes[0].name}
		phase={publishStep}
		onPhaseChange={step => modals.setStep(step)}
		onInvalidPhase={step => toolsPage.replaceWorkflowStep(step)}
	/>
{/if}
