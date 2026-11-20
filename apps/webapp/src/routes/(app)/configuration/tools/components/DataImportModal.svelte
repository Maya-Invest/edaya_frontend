<script lang="ts">
	import type { ImportTypeKey } from '$lib/import/catalog/types';
	import type { ImportMode } from '../import-state.svelte';
	import type { ImportWorkflowStep } from '../lib/tools-workflow';
	import { page as route } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import TaskSteps from '$lib/components/ui/TaskSteps.svelte';
	import { locale, t } from '$lib/i18n';
	import { IMPORT_TYPE_DEFINITIONS } from '$lib/import/catalog/import-types';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { untrack } from 'svelte';
	import { canonicalImportStep, IMPORT_WORKFLOW_STEPS, retainsImportDraft } from '../lib/tools-workflow';
	import { getToolsPageState } from '../tools-page.svelte';
	import ImportRows from './ImportRows.svelte';

	let { open = $bindable(false), step = 'settings', importType = 'students', onStepChange, onImportTypeChange, onInvalidStep }: {
		open?: boolean;
		step?: string;
		importType?: ImportTypeKey;
		onStepChange?: (step: ImportWorkflowStep) => void;
		onImportTypeChange?: (type: ImportTypeKey) => void;
		onInvalidStep?: (step: ImportWorkflowStep) => void;
	} = $props();
	const page = getToolsPageState();
	const importState = page.importState;
	const dirtyWork = getDirtyWork();
	let yearId = $state('');
	let mode = $state<ImportMode>('M');
	let effectiveDate = $state('');
	let selectedFiles = $state<FileList>();
	let pendingUploads = $state<File[]>([]);
	let replacementId = $state('');
	let notice = $state('');
	let settingsIdentity: string | undefined;
	let settingsBaseline = $state('');
	let displayedBatchId: string | undefined;
	let previousType = untrack(() => importType);
	const stage = $derived(canonicalImportStep(step));
	const definitions = $derived(IMPORT_TYPE_DEFINITIONS.filter(item => page.allowedImportTabs.includes(item.key)));
	const files = $derived([...new Map(importState.detail?.files.map(file => [file.fileId, file]) ?? []).values()]);
	const running = $derived(importState.detail?.batch.state === 'running');
	const ready = $derived(importState.detail?.rows.filter(row => row.outcome === 'pending').length ?? 0);
	const settingsDirty = $derived(open && settingsBaseline !== '' && draftSignature() !== settingsBaseline);
	const dirty = $derived(settingsDirty || pendingUploads.length > 0);
	const typeLabel = (type: string) => $t(IMPORT_TYPE_DEFINITIONS.find(item => item.key === type)?.labelKey ?? type);
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const stages = $derived(IMPORT_WORKFLOW_STEPS.map(key => ({ key, label: $t(`durableImport.stage.${key}`), disabled: importState.busy })));
	const workingStatus = $derived(stage === 'history' ? 'ready' : importState.detail && importState.readStatus === 'error' ? 'ready' : importState.readStatus);

	function draftSignature() {
		return JSON.stringify([yearId, mode, effectiveDate]);
	}
	function dateLabel(value: string) {
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? $t('dataState.unavailable') : new Intl.DateTimeFormat($locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(date);
	}
	function retained(destination: URL) {
		const source = new URL($route.url);
		// Type selection retains settings, but must not reinterpret unuploaded files.
		if (pendingUploads.length === 0) {
			const panel = destination.searchParams.get('taskPanel');
			if (panel === null)
				source.searchParams.delete('taskPanel');
			else source.searchParams.set('taskPanel', panel);
		}
		return retainsImportDraft(source, destination);
	}
	function chooseStep(next: string) {
		const target = canonicalImportStep(next);
		if ((target === 'preview' || target === 'execution') && !page.modals.target) {
			notice = $t('durableImport.chooseBatch');
			onStepChange?.('settings');
			return;
		}
		onStepChange?.(target);
	}
	function chooseBatch(id: string | null) {
		const change = () => page.selectImportBatch(id, id ? 'history' : 'settings');
		if (dirtyWork)
			dirtyWork.request(change);
		else change();
	}
	function discardFiles() {
		pendingUploads = [];
		selectedFiles = undefined;
		replacementId = '';
	}

	$effect(() => {
		const school = authSession.schoolId;
		const subject = authSession.subjectId;
		if (!school || !subject || !open) {
			importState.disconnect();
			return;
		}
		const batchId = page.modals.target;
		untrack(() => {
			void importState.connect(batchId, `${school}:${subject}`);
		});
		return () => importState.disconnect();
	});
	$effect(() => {
		if (open && (stage === 'preview' || stage === 'execution') && !page.modals.target) {
			notice = $t('durableImport.chooseBatch');
			onInvalidStep?.('settings');
		}
	});
	$effect(() => {
		const batch = importState.detail?.batch;
		const identity = `${open}:${authSession.schoolId}:${page.modals.target ?? 'new'}:${batch?.id ?? 'new'}`;
		const incoming = JSON.stringify([batch?.academicYearId ?? academicContext.yearId, batch?.defaultOnExisting ?? 'M', batch?.enrollmentEffectiveDate ?? '']);
		untrack(() => {
			if (identity !== settingsIdentity || draftSignature() === settingsBaseline) {
				yearId = batch?.academicYearId ?? academicContext.yearId;
				mode = batch?.defaultOnExisting ?? 'M';
				effectiveDate = batch?.enrollmentEffectiveDate ?? '';
				settingsBaseline = incoming;
			}
			settingsIdentity = identity;
		});
	});
	$effect(() => {
		const batchId = importState.detail?.batch.id;
		if (!open || batchId !== displayedBatchId || previousType !== importType) {
			displayedBatchId = batchId;
			previousType = importType;
			discardFiles();
		}
	});

	async function saveSettings() {
		const submitted = draftSignature();
		const identity = settingsIdentity;
		const saved = await importState.settings(mode, effectiveDate);
		if (saved && settingsIdentity === identity) {
			settingsBaseline = submitted;
			onStepChange?.('files');
		}
	}
	async function create() {
		const batch = await importState.create(yearId, mode, effectiveDate);
		if (batch) {
			settingsBaseline = draftSignature();
			page.selectImportBatch(batch.id, 'files');
		}
	}
	async function upload() {
		const target = replacementId ? files.find(file => file.fileId === replacementId) : null;
		if (replacementId && !target)
			return;
		for (const file of [...pendingUploads]) {
			const saved = await importState.submit(file, target?.type ?? importType, replacementId || undefined);
			if (!saved)
				return;
			pendingUploads = pendingUploads.filter(item => item !== file);
		}
		discardFiles();
	}
	async function validate() {
		if (await importState.validate())
			onStepChange?.('preview');
	}
	async function retry() {
		if (await importState.retry())
			onStepChange?.('preview');
	}
</script>

<FormModal presentation="assistant" {dirty} retainsDraft={retained} busy={importState.busy} bind:open title={$t('durableImport.title')} description={$t('durableImport.description')} onSubmit={() => {}}>
	{#snippet navigation()}
		<div class="space-y-2">
			<p class="text-sm">{academicContext.years.find(year => year.id === yearId)?.label ?? $t('durableImport.new')} · {importState.detail ? $t(`durableImport.status.${importState.detail.batch.state}`) : $t('durableImport.new')}</p>
			<TaskSteps label={$t('durableImport.stages')} steps={stages} current={stage} onSelect={chooseStep} />
		</div>
	{/snippet}
	<div data-testid="data-import-modal" class="space-y-6">
		{#if notice}<p role="status" class="text-sm">{notice}</p>{/if}
		{#if importState.mutationError}<p role="alert" class="text-sm text-destructive">{importState.mutationError}</p>{/if}
		{#if importState.savedRefreshFailed}<p role="status" class="text-sm">{$t('mutation.savedRefreshFailed')}</p>{/if}
		{#if importState.detail && importState.error}<div role="alert" class="space-y-2 text-sm"><p>{importState.error}</p><Button variant="outline" onclick={() => importState.refresh()}>{$t('dataState.retry')}</Button></div>{/if}
		{#if settingsDirty && stage !== 'settings'}<p role="status" class="text-sm">{$t('durableImport.unsavedSettings')}</p>{/if}
		{#if pendingUploads.length && stage !== 'files'}<p role="status" class="text-sm">{$t('durableImport.unsavedFiles', { count: pendingUploads.length })}</p>{/if}
		<DataState status={workingStatus} errorMessage={importState.error} onRetry={() => { void importState.refresh(); }}>
			{#if stage === 'settings'}
				<section class="max-w-lg space-y-4" aria-label={$t('durableImport.settings')}>
					<label class="block space-y-2 text-sm"><span>{$t('durableImport.year')}</span>
						<SelectField class="w-full border border-input bg-background" bind:value={yearId} disabled={Boolean(importState.detail) || importState.busy}>
							{#each academicContext.years as year (year.id)}<option value={year.id}>{year.label}</option>{/each}
						</SelectField>
					</label>
					<label class="block space-y-2 text-sm"><span>{$t('durableImport.mode')}</span>
						<SelectField class="w-full border border-input bg-background" data-testid="import-mode" bind:value={mode} disabled={running || importState.busy}>
							<option value="M">M — {$t('durableImport.merge')}</option><option value="S">S — {$t('durableImport.skip')}</option><option value="O">O — {$t('durableImport.overwrite')}</option>
						</SelectField>
					</label>
					<label class="block space-y-2 text-sm"><span>{$t('durableImport.effectiveDate')}</span>
						<input data-testid="import-enrollment-date" type="date" class="ui-field min-h-11 w-full rounded-full border border-input bg-background px-4" bind:value={effectiveDate} disabled={running || importState.busy} />
					</label>
					<p class="text-sm text-muted-foreground">{$t(`durableImport.modeHelp.${mode}`)} {$t('durableImport.rowOverride')}</p>
				</section>
			{:else if stage === 'files'}
				<section class="space-y-4" aria-label={$t('durableImport.files')}>
					<label class="block max-w-lg space-y-2 text-sm"><span>{$t('durableImport.type')}</span>
						<SelectField class="w-full border border-input bg-background" data-testid="data-import-type-select" value={importType} onchange={event => onImportTypeChange?.(event.currentTarget.value as ImportTypeKey)} disabled={importState.busy || Boolean(replacementId) || pendingUploads.length > 0}>
							{#each definitions as definition (definition.key)}<option value={definition.key}>{$t(definition.labelKey)}</option>{/each}
						</SelectField>
					</label>
					<div class="flex flex-wrap gap-2"><Button data-testid="import-template-xlsx" variant="outline" onclick={() => importState.template(importType, 'xlsx')}>{$t('durableImport.template')} XLSX</Button><Button variant="outline" onclick={() => importState.template(importType, 'csv')}>{$t('durableImport.template')} CSV</Button><Button variant="outline" disabled={!yearId || importState.busy} onclick={() => importState.export(importType, yearId, 'xlsx')}>{$t('durableImport.exportExisting')}</Button></div>
					{#if importState.detail}
						<label class="block max-w-lg space-y-2 text-sm"><span>{$t('durableImport.destination')}</span>
							<SelectField class="w-full border border-input bg-background" bind:value={replacementId} disabled={running || importState.busy || pendingUploads.length > 0}>
								<option value="">{$t('durableImport.addFile')}</option>
								{#each files as file (file.fileId)}<option value={file.fileId}>{$t('durableImport.replace')} {file.fileName} · {typeLabel(file.type)}</option>{/each}
							</SelectField>
						</label>
						<label class="block space-y-2 text-sm"><span>{$t('durableImport.chooseFile')}</span><input data-testid="import-file-input" type="file" accept=".csv,.xlsx" multiple={!replacementId} bind:files={selectedFiles} onchange={event => pendingUploads = Array.from(event.currentTarget.files ?? [])} disabled={running || importState.busy} class="block min-h-11 w-full rounded-collection border border-input p-2" /></label>
						{#if pendingUploads.length}<div class="space-y-2 text-sm"><p>{$t('durableImport.unsavedFiles', { count: pendingUploads.length })}</p><ul>{#each pendingUploads as file, index (`${file.name}:${index}`)}<li class="break-words">{file.name}</li>{/each}</ul><Button variant="outline" disabled={importState.busy} onclick={discardFiles}>{$t('durableImport.discardFiles')}</Button></div>{/if}
						<p class="text-xs text-muted-foreground">{$t('durableImport.fileLimit')} {$t('durableImport.correctionHelp')}</p>
						<ul class="space-y-2">{#each files as file (file.fileId)}<li class="break-words text-sm">{file.fileName} · {typeLabel(file.type)} · {$t('durableImport.fileRevision', { revision: file.revision })}</li>{/each}</ul>
					{:else}<p class="text-sm">{$t('durableImport.chooseBatch')}</p>{/if}
				</section>
			{:else if stage === 'preview' || stage === 'execution'}
				{#if importState.detail}
					<section data-testid="import-progress" data-state={importState.detail.batch.state} data-created={importState.detail.counts.created ?? 0} data-blocked={(importState.detail.counts.blocked ?? 0) + (importState.detail.counts.dependency_blocked ?? 0)} class="space-y-4" aria-label={$t(`durableImport.stage.${stage}`)}>
						<h2 class="text-xl font-semibold">{$t(`durableImport.stage.${stage}`)} · {$t(`durableImport.status.${importState.detail.batch.state}`)}</h2>
						<p class="text-sm">{$t('durableImport.saveUnit')}</p>
						{#if running}<p role="status" class="rounded-collection bg-primary/10 p-4 text-sm">{$t('durableImport.background')}</p>{/if}
						{#if importState.previewStale}<p role="status" class="text-sm">{$t('durableImport.previewStale')}</p>{/if}
						{#key importState.detail.batch.id}<ImportRows {importState} detail={importState.detail} />{/key}
					</section>
				{/if}
			{:else}
				<section class="space-y-4" aria-label={$t('durableImport.history')}>
					<h2 class="text-xl font-semibold">{$t('durableImport.history')}</h2>
					<p class="text-xs text-muted-foreground">{timezone}</p>
					<label class="block space-y-2 text-sm"><span>{$t('durableImport.history')}</span>
						<SelectField class="w-full border border-input bg-background" value={page.modals.target ?? ''} onchange={event => chooseBatch(event.currentTarget.value || null)} disabled={importState.busy}>
							<option value="">{$t('durableImport.new')}</option>
							{#each importState.history as batch (batch.id)}<option value={batch.id}>{dateLabel(batch.createdAt)} · {academicContext.years.find(year => year.id === batch.academicYearId)?.label ?? batch.academicYearId} · {$t(`durableImport.status.${batch.state}`)}</option>{/each}
						</SelectField>
					</label>
					{#if importState.loading}<p role="status" class="text-sm">{$t('durableImport.loading')}</p>{/if}
					{#if importState.historyError}<p role="alert" class="text-sm text-destructive">{importState.historyError}</p><Button variant="outline" onclick={() => importState.loadHistory()}>{$t('dataState.retry')}</Button>{/if}
					<Button variant="outline" onclick={() => importState.moreHistory()} disabled={importState.loading || importState.history.length === 0}>{$t('durableImport.older')}</Button>
					<ul class="space-y-4">{#each files as file (file.fileId)}<li class="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 text-sm"><span class="break-words">{file.fileName} · {typeLabel(file.type)} · {$t('durableImport.fileRevision', { revision: file.revision })}</span><div class="flex flex-wrap gap-2"><Button data-testid="import-corrections-xlsx" variant="outline" onclick={() => importState.report(file.fileId)}>{$t('durableImport.corrections')} XLSX</Button><Button variant="outline" onclick={() => importState.report(file.fileId, 'csv')}>{$t('durableImport.corrections')} CSV</Button></div></li>{/each}</ul>
					{#if importState.detail}<ImportRows {importState} detail={importState.detail} />{/if}
				</section>
			{/if}
		</DataState>
	</div>
	{#snippet footer({ close })}
		<div class="flex w-full flex-wrap items-center justify-end gap-2">
			<Button variant="outline" onclick={close}>{$t('durableImport.close')}</Button>
			{#if importState.busy}<p role="status" class="text-sm">{$t('durableImport.saving')}</p>{/if}
			{#if stage === 'settings'}
				{#if !importState.detail}<Button disabled={!yearId || importState.busy || Boolean(page.modals.target)} data-testid="import-create" onclick={create}>{$t('durableImport.create')}</Button>
				{:else if settingsDirty}<Button disabled={importState.busy || running} onclick={saveSettings}>{$t('durableImport.saveSettings')}</Button>
				{:else}<Button disabled={importState.busy} onclick={() => chooseStep('files')}>{$t('durableImport.continueFiles')}</Button>{/if}
			{:else if stage === 'files'}
				{#if pendingUploads.length}<Button disabled={importState.busy || running || settingsDirty} data-testid="import-upload" onclick={upload}>{$t('durableImport.upload')}</Button>
				{:else}<Button disabled={!files.length || importState.busy} onclick={() => chooseStep('preview')}>{$t('durableImport.preview')}</Button>{/if}
			{:else if stage === 'preview'}
				<Button variant={importState.canExecute ? 'outline' : 'default'} disabled={importState.busy || running || !files.length || dirty || Boolean(importState.error)} data-testid="import-validate" onclick={validate}>{$t('durableImport.validate')}</Button>
				{#if importState.detail?.batch.state === 'validated'}<Button disabled={importState.busy || dirty} onclick={() => chooseStep('execution')}>{$t('durableImport.reviewExecution')}</Button>{/if}
			{:else if stage === 'execution'}
				<Button variant="outline" onclick={() => importState.refresh()} disabled={!importState.detail || importState.busy}>{$t('durableImport.refresh')}</Button>
				{#if running}<Button variant="outline" disabled={importState.busy} onclick={() => importState.cancel()}>{$t('durableImport.stop')}</Button>
				{:else if importState.detail?.batch.state === 'completed'}<Button variant="outline" disabled={importState.busy || dirty} onclick={retry}>{$t('durableImport.retry')}</Button>
				{:else}<Button disabled={!importState.canExecute || dirty} data-testid="import-confirm" onclick={() => importState.confirm()}>{$t('durableImport.confirm')} ({ready}) · {importState.detail?.batch.defaultOnExisting ?? mode}</Button>{/if}
			{:else}<Button variant="outline" onclick={() => importState.refresh()} disabled={!importState.detail || importState.busy}>{$t('durableImport.refresh')}</Button>{/if}
		</div>
	{/snippet}
</FormModal>
