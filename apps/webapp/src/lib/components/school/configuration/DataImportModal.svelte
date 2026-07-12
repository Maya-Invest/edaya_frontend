<script lang="ts">
	import type { ImportTypeKey } from '$lib/import/catalog/types';
	import type { StudentImportRunResult } from '$lib/import/students/runner';
	import type { StudentImportRow, StudentImportValidationResult } from '$lib/import/students/types';
	import { academicContext } from '$lib/academic/context.svelte';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { authSession } from '$lib/auth/session.svelte';
	import ImportFileDropzone from '$lib/components/school/configuration/ImportFileDropzone.svelte';
	import ImportProgressBar from '$lib/components/school/configuration/ImportProgressBar.svelte';
	import ImportValidationTable from '$lib/components/school/configuration/ImportValidationTable.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Download, FileSpreadsheet, LoaderCircle } from '$lib/icons';
	import {
		IMPORT_TYPE_DEFINITIONS,
		getImportTypeDefinition,
	} from '$lib/import/catalog/import-types';
	import {
		downloadImportCsvTemplate,
		downloadImportExcelTemplate,
	} from '$lib/import/shared/template-download';
	import { loadExistingStudentMatricules } from '$lib/import/students/load-existing-matricules';
	import { parseStudentImportFile } from '$lib/import/students/parser';
	import { runStudentImport } from '$lib/import/students/runner';
	import {
		canImportValidatedStudents,
		validateStudentImportRows,
	} from '$lib/import/students/validator';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { notifyStudentsListChanged } from '$lib/students/notify-students-list-changed';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	type ImportStep = 'download' | 'upload' | 'validate' | 'execute';

	const STEPS: ImportStep[] = ['download', 'upload', 'validate', 'execute'];

	const STEP_LABEL_KEYS: Record<ImportStep, string> = {
		download: 'import.students.stepDownload',
		upload: 'import.students.stepUpload',
		validate: 'import.students.stepValidate',
		execute: 'import.students.stepExecute',
	};

	const PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.students.unsupportedFormat',
		file_too_large: 'import.students.fileTooLarge',
		empty_file: 'import.students.emptyFile',
	};

	let {
		open = $bindable(false),
		initialImportType = 'students',
	}: {
		open?: boolean;
		initialImportType?: ImportTypeKey;
	} = $props();

	let step = $state<ImportStep>('download');
	let selectedImportType = $state<ImportTypeKey>('students');
	let selectedFileName = $state('');
	let parsedRows = $state<StudentImportRow[]>([]);
	let parseErrorMessage = $state('');
	let parsing = $state(false);
	let validationResult = $state<StudentImportValidationResult | null>(null);
	let existingMatricules = $state<Set<string>>(new Set());
	let loadingMatricules = $state(false);
	let importing = $state(false);
	let importProgress = $state({ current: 0, total: 0 });
	let importResult = $state<StudentImportRunResult | null>(null);
	let importFatalError = $state('');

	const studentsHref = appPath('/(app)/school/students/[[id]]');
	const selectedDefinition = $derived(getImportTypeDefinition(selectedImportType));
	const isStudentsImport = $derived(selectedImportType === 'students');
	const isActiveImport = $derived(selectedDefinition.status === 'active');
	const selectedImportTypeLabel = $derived($t(selectedDefinition.labelKey));

	const hasClasses = $derived(academicContext.classes.length > 0);
	const previewRows = $derived(parsedRows.slice(0, 3));
	const canGoToUpload = $derived(
		isActiveImport && (!isStudentsImport || hasClasses),
	);
	const canGoToValidate = $derived(
		isStudentsImport && parsedRows.length > 0 && !parseErrorMessage && !parsing,
	);
	const canStartImport = $derived(canImportValidatedStudents(validationResult));
	const validationIssues = $derived([
		...(validationResult?.errors ?? []),
		...(validationResult?.warnings ?? []),
	]);
	const showStudentsPrerequisite = $derived(
		isStudentsImport && step === 'download' && !hasClasses,
	);

	function resetWizard() {
		step = 'download';
		selectedFileName = '';
		parsedRows = [];
		parseErrorMessage = '';
		parsing = false;
		validationResult = null;
		importing = false;
		importProgress = { current: 0, total: 0 };
		importResult = null;
		importFatalError = '';
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (next) {
			selectedImportType = initialImportType;
			resetWizard();
			void loadMatriculesIfNeeded();
			return;
		}
		resetWizard();
	}

	function handleImportTypeChange(next: string) {
		const importType = next as ImportTypeKey;
		if (importType === selectedImportType) {
			return;
		}
		selectedImportType = importType;
		resetWizard();
		void loadMatriculesIfNeeded();
	}

	function stepIndex(value: ImportStep): number {
		return STEPS.indexOf(value);
	}

	function formatParseError(message: string): string {
		const key = PARSE_ERROR_KEYS[message];
		return key ? get(t)(key) : message;
	}

	function clearParsedState() {
		parsedRows = [];
		parseErrorMessage = '';
		validationResult = null;
	}

	async function loadMatriculesIfNeeded() {
		if (!isStudentsImport || loadingMatricules || existingMatricules.size > 0) {
			return;
		}
		loadingMatricules = true;
		try {
			existingMatricules = await loadExistingStudentMatricules();
		}
		catch {
			existingMatricules = new Set();
		}
		finally {
			loadingMatricules = false;
		}
	}

	function runValidation() {
		validationResult = validateStudentImportRows(parsedRows, {
			classes: academicContext.classes.map(classGroup => ({
				id: classGroup.id,
				name: classGroup.name,
			})),
			existingMatricules,
		});
	}

	async function goToValidateStep() {
		await loadMatriculesIfNeeded();
		runValidation();
		step = 'validate';
	}

	async function startImport() {
		if (!validationResult || !canStartImport || importing || !isStudentsImport) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		importResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: validationResult.validRows.length };
		step = 'execute';

		try {
			importResult = await runStudentImport({
				schoolId,
				client: getBrowserSchoolClient(),
				rows: validationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.students.importFailed');
			importResult = {
				created: 0,
				failed: [],
				studentIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function handleFileSelected(file: File) {
		if (!isStudentsImport) {
			return;
		}

		selectedFileName = file.name;
		parsing = true;
		clearParsedState();

		try {
			const result = await parseStudentImportFile(file);
			parsedRows = result.rows;

			if (result.errors.length > 0) {
				parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
			}
			else if (result.rows.length === 0) {
				parseErrorMessage = get(t)('import.students.emptyFile');
			}
		}
		catch {
			parseErrorMessage = get(t)('import.students.unsupportedFormat');
		}
		finally {
			parsing = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="flex max-h-[min(90vh,52rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
		data-testid="data-import-modal"
	>
		<div class="shrink-0 space-y-5 border-b border-border px-6 pb-4 pt-6">
			<Dialog.Header>
				<Dialog.Title>{$t('import.modalTitle')}</Dialog.Title>
				<Dialog.Description>
					{$t('import.modalDescription', { type: selectedImportTypeLabel })}
				</Dialog.Description>
			</Dialog.Header>

			<ol class="flex flex-wrap gap-2" aria-label={$t('import.modalTitle')}>
				{#each STEPS as wizardStep, index (wizardStep)}
					<li
						class={cn(
							'rounded-full border px-3 py-1 text-xs font-medium',
							stepIndex(step) === index
								? 'border-primary bg-primary/10 text-primary'
								: stepIndex(step) > index
								? 'border-border text-muted-foreground'
								: 'border-border bg-secondary/40 text-muted-foreground',
						)}
					>
						{$t(STEP_LABEL_KEYS[wizardStep])}
					</li>
				{/each}
			</ol>
		</div>

		<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-4">
			{#if step === 'download'}
				<section class="space-y-4" data-testid="data-import-step-download">
					<div class="space-y-2">
						<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('import.typeSelectLabel')}
						</Label>
						<Select.Root
							type="single"
							value={selectedImportType}
							onValueChange={handleImportTypeChange}
						>
							<Select.Trigger data-testid="data-import-type-select">
								<Select.Value placeholder={$t('import.typeSelectPlaceholder')}>
									{selectedImportTypeLabel}
								</Select.Value>
							</Select.Trigger>
							<Select.Content class="z-[100]">
								{#each IMPORT_TYPE_DEFINITIONS as definition (definition.key)}
									<Select.Item value={definition.key} label={$t(definition.labelKey)}>
										<div class="flex items-center justify-between gap-3">
											<span>{$t(definition.labelKey)}</span>
											{#if definition.status === 'template_only'}
												<span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
													{$t('import.status.templateOnly')}
												</span>
											{/if}
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					{#if showStudentsPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.students.prerequisiteMissing')}
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">
							{$t(selectedDefinition.hintKey)}
						</p>
					{/if}

					{#if !isActiveImport}
						<p class="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
							{$t('import.comingSoon')}
						</p>
					{/if}

					<div class="flex flex-wrap gap-2">
						<Button
							variant="outline"
							class="justify-center"
							onclick={() => downloadImportCsvTemplate(selectedDefinition)}
							data-testid="data-import-download-csv-template"
						>
							<Download class="mr-2 size-4" aria-hidden="true" />
							{$t('import.students.downloadCsvTemplate')}
						</Button>
						<Button
							class="justify-center"
							onclick={() => downloadImportExcelTemplate(selectedDefinition)}
							data-testid="data-import-download-excel-template"
						>
							<FileSpreadsheet class="mr-2 size-4" aria-hidden="true" />
							{$t('import.students.downloadExcelTemplate')}
						</Button>
					</div>

					<div class="rounded-xl border border-border bg-secondary/20 p-4">
						<h3 class="mb-3 text-sm font-semibold">{$t('import.students.columnsTitle')}</h3>
						<ul class="space-y-2 text-sm">
							{#each selectedDefinition.columns as column (column.key)}
								<li class="flex items-start justify-between gap-3">
									<span>
										<span class="font-mono text-xs text-muted-foreground">{column.key}</span>
										<span class="mx-2 text-muted-foreground">·</span>
										<span>{$t(column.labelKey)}</span>
									</span>
									<span
										class={cn(
											'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
											column.required
												? 'bg-primary/10 text-primary'
												: 'bg-muted text-muted-foreground',
										)}
									>
										{column.required
											? $t('import.students.columnRequired')
											: $t('import.students.columnOptional')}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</section>
			{:else if isStudentsImport && step === 'upload'}
				<section class="space-y-4" data-testid="student-import-step-upload">
					<p class="text-sm text-muted-foreground">{$t('import.students.uploadHint')}</p>

					<ImportFileDropzone
						disabled={parsing}
						errorMessage={parseErrorMessage}
						{selectedFileName}
						onFileSelected={handleFileSelected}
					/>

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="student-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.students.parsing')}
						</div>
					{:else if parsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="student-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.students.parseSuccess', { n: parsedRows.length })}
							</p>

							{#if previewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.students.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each previewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.prenom} {row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.classe}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isStudentsImport && step === 'validate' && validationResult}
				<section class="space-y-4" data-testid="student-import-step-validate">
					<div class="grid gap-2 sm:grid-cols-3">
						<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
							{$t('import.students.validation.summaryReady', { n: validationResult.validRows.length })}
						</p>
						<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{$t('import.students.validation.summaryErrors', { n: validationResult.errors.length })}
						</p>
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.students.validation.summaryWarnings', { n: validationResult.warnings.length })}
						</p>
					</div>

					<ImportValidationTable issues={validationIssues} />
				</section>
			{:else if isStudentsImport && step === 'execute'}
				<section class="space-y-4" data-testid="student-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.students.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.students.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if importResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.students.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.students.resultCreated', { n: importResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.students.resultFailed', { n: importResult.failed.length })}
								</p>
							</div>

							{#if importResult.created === 0 && importResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.students.resultNothing')}</p>
							{/if}

							{#if importResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.students.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each importResult.failed as failure (failure.rowIndex + failure.studentName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.studentName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.students.resultUnexpected')}</p>
					{/if}
				</section>
			{:else}
				<section class="space-y-4" data-testid="data-import-coming-soon">
					<p class="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
						{$t('import.comingSoon')}
					</p>
				</section>
			{/if}
		</div>

		<Dialog.Footer class="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-between">
			<div class="flex gap-2">
				{#if isStudentsImport && (step === 'upload' || step === 'validate')}
					<Button
						variant="outline"
						disabled={importing}
						onclick={() => (step = step === 'validate' ? 'upload' : 'download')}
						data-testid="data-import-back"
					>
						{$t('common.back')}
					</Button>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				{#if isStudentsImport && step === 'execute' && importResult}
					<Button
						onclick={() => {
							notifyStudentsListChanged();
							handleOpenChange(false);
							void appGoto(studentsHref, { invalidateAll: true });
						}}
						data-testid="student-import-view-students"
					>
						{$t('import.students.viewStudents')}
					</Button>
				{/if}
				<Button variant="outline" disabled={importing} onclick={() => handleOpenChange(false)}>
					{$t('common.close')}
				</Button>
				{#if step === 'download'}
					<Button
						disabled={!canGoToUpload}
						title={!isActiveImport ? $t('import.comingSoon') : undefined}
						onclick={() => (step = 'upload')}
						data-testid="data-import-next"
					>
						{$t('common.next')}
					</Button>
				{:else if isStudentsImport && step === 'upload'}
					<Button
						disabled={!canGoToValidate}
						onclick={() => void goToValidateStep()}
						data-testid="data-import-next"
					>
						{$t('common.next')}
					</Button>
				{:else if isStudentsImport && step === 'validate' && validationResult}
					<Button
						disabled={!canStartImport || importing}
						onclick={() => void startImport()}
						data-testid="data-import-start"
					>
						{#if importing}
							<LoaderCircle class="mr-2 size-4 animate-spin" aria-hidden="true" />
						{/if}
						{$t('import.students.importReady', { n: validationResult.validRows.length })}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
