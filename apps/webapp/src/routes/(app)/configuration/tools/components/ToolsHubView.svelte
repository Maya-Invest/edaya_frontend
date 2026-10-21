<script lang="ts">
	import type {
		ImportWorkflowStep,
		TimetableGenerationStep,
	} from '../lib/tools-workflow';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, Upload } from '$lib/icons';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import {
		IMPORT_TYPE_TABS,
		IMPORT_WORKFLOW_STEPS,
		TIMETABLE_GENERATION_STEPS,
		TIMETABLE_SETUP_TABS,
	} from '../lib/tools-workflow';
	import { getToolsPageState } from '../tools-page.svelte';
	import DataImportModal from './DataImportModal.svelte';
	import SchoolTimetableGenerationModal from './SchoolTimetableGenerationModal.svelte';

	const toolsPage = getToolsPageState();
	const modals = toolsPage.modals;
	const importOpen = bindUrlModal(modals, 'import');
	const generationOpen = bindUrlModal(modals, 'generate-timetable');

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
</script>

<ListPageHeader
	eyebrow={$t('tools.eyebrow')}
	title={$t('tools.title')}
	description={$t('tools.description')}
/>

<div class="grid gap-4 md:grid-cols-2 xl:max-w-4xl">
	<PermissionGate permission="STUDENT_CREATE">
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
	</PermissionGate>

	<PermissionGate permission="TIMETABLE_MANAGE" mode="hide">
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

			<div class="mt-auto flex flex-wrap gap-2">
				<Button
					onclick={() => modals.open('generate-timetable', { step: 'setup', tab: 'subjects' })}
					data-testid="timetable-planning-action"
				>
					{$t('tools.timetablePlanning.card.action')}
				</Button>
			</div>
		</article>
	</PermissionGate>
	<PermissionGate permission="FINANCIAL_REPORT_READ">
		<article class="rounded-xl border border-border bg-card p-5 shadow-sm">
			<h3 class="font-display text-lg font-semibold">{$t('finance.reconciliation')}</h3>
			<p class="my-3 text-sm text-muted-foreground">{$t('finance.checksDescription')}</p>
			<Button onclick={() => appGoto('/configuration/tools/finance-checks')}>{$t('common.open')}</Button>
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
