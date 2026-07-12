<script lang="ts">
	import type { ImportTypeKey } from '$lib/import/catalog/types';
	import type { ClassImportRunResult } from '$lib/import/classes/runner';
	import type { ClassImportRow, ClassImportValidationResult } from '$lib/import/classes/types';
	import type { GuardianImportRunResult } from '$lib/import/guardians/runner';
	import type { GuardianImportRow, GuardianImportValidationResult } from '$lib/import/guardians/types';
	import type { StudentMatriculeEntry } from '$lib/import/shared/load-student-matricule-index';
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
	import { notifyGuardiansListChanged } from '$lib/guardians/notify-guardians-list-changed';
	import { t } from '$lib/i18n';
	import { Download, FileSpreadsheet, LoaderCircle } from '$lib/icons';
	import {
		IMPORT_TYPE_DEFINITIONS,
		getImportTypeDefinition,
	} from '$lib/import/catalog/import-types';
	import { parseClassImportFile } from '$lib/import/classes/parser';
	import { runClassImport } from '$lib/import/classes/runner';
	import {
		canImportValidatedClasses,
		validateClassImportRows,
	} from '$lib/import/classes/validator';
	import { parseGuardianImportFile } from '$lib/import/guardians/parser';
	import { runGuardianImport } from '$lib/import/guardians/runner';
	import {
		canImportValidatedGuardians,
		validateGuardianImportRows,
	} from '$lib/import/guardians/validator';
	import {
		loadStudentMatriculeIndex,
	} from '$lib/import/shared/load-student-matricule-index';
	import {
		downloadImportCsvTemplate,
		downloadImportExcelTemplate,
	} from '$lib/import/shared/template-download';
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

	const STUDENT_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.students.unsupportedFormat',
		file_too_large: 'import.students.fileTooLarge',
		empty_file: 'import.students.emptyFile',
	};

	const CLASS_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.classes.unsupportedFormat',
		file_too_large: 'import.classes.fileTooLarge',
		empty_file: 'import.classes.emptyFile',
	};

	const GUARDIAN_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.guardians.unsupportedFormat',
		file_too_large: 'import.guardians.fileTooLarge',
		empty_file: 'import.guardians.emptyFile',
	};

	const STUDENT_COLUMN_LABEL_KEYS: Record<string, string> = {
		prenom: 'import.students.columns.prenom',
		nom: 'import.students.columns.nom',
		classe: 'import.students.columns.classe',
		date_naissance: 'import.students.columns.date_naissance',
		genre: 'import.students.columns.genre',
		matricule: 'import.students.columns.matricule',
	};

	const CLASS_COLUMN_LABEL_KEYS: Record<string, string> = {
		nom: 'import.types.classes.columns.nom',
		niveau: 'import.types.classes.columns.niveau',
		capacite: 'import.types.classes.columns.capacite',
	};

	const GUARDIAN_COLUMN_LABEL_KEYS: Record<string, string> = {
		prenom: 'import.types.guardians.columns.prenom',
		nom: 'import.types.guardians.columns.nom',
		email: 'import.types.guardians.columns.email',
		telephone: 'import.types.guardians.columns.telephone',
		eleve_matricule: 'import.types.guardians.columns.eleve_matricule',
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
	let studentParsedRows = $state<StudentImportRow[]>([]);
	let classParsedRows = $state<ClassImportRow[]>([]);
	let guardianParsedRows = $state<GuardianImportRow[]>([]);
	let parseErrorMessage = $state('');
	let parsing = $state(false);
	let studentValidationResult = $state<StudentImportValidationResult | null>(null);
	let classValidationResult = $state<ClassImportValidationResult | null>(null);
	let guardianValidationResult = $state<GuardianImportValidationResult | null>(null);
	let studentMatriculeIndex = $state<Map<string, StudentMatriculeEntry>>(new Map());
	let existingMatricules = $state<Set<string>>(new Set());
	let loadingMatricules = $state(false);
	let importing = $state(false);
	let importProgress = $state({ current: 0, total: 0 });
	let studentImportResult = $state<StudentImportRunResult | null>(null);
	let classImportResult = $state<ClassImportRunResult | null>(null);
	let guardianImportResult = $state<GuardianImportRunResult | null>(null);
	let importFatalError = $state('');

	const studentsHref = appPath('/(app)/school/students/[[id]]');
	const classesHref = appPath('/(app)/configuration/classes/[[id]]');
	const guardiansHref = appPath('/(app)/school/guardians/[[id]]');
	const selectedDefinition = $derived(getImportTypeDefinition(selectedImportType));
	const isStudentsImport = $derived(selectedImportType === 'students');
	const isClassesImport = $derived(selectedImportType === 'classes');
	const isGuardiansImport = $derived(selectedImportType === 'guardians');
	const isWiredImport = $derived(isStudentsImport || isClassesImport || isGuardiansImport);
	const isActiveImport = $derived(selectedDefinition.status === 'active');
	const selectedImportTypeLabel = $derived($t(selectedDefinition.labelKey));

	const hasClasses = $derived(academicContext.classes.length > 0);
	const hasStudents = $derived(academicContext.studentCount > 0);
	const studentPreviewRows = $derived(studentParsedRows.slice(0, 3));
	const classPreviewRows = $derived(classParsedRows.slice(0, 3));
	const guardianPreviewRows = $derived(guardianParsedRows.slice(0, 3));
	const parsedRowCount = $derived.by(() => {
		if (isStudentsImport) {
			return studentParsedRows.length;
		}
		if (isClassesImport) {
			return classParsedRows.length;
		}
		return guardianParsedRows.length;
	});
	const canGoToUpload = $derived.by(() => {
		if (!isActiveImport) {
			return false;
		}
		if (isStudentsImport && !hasClasses) {
			return false;
		}
		if (isGuardiansImport && !hasStudents) {
			return false;
		}
		return true;
	});
	const canGoToValidate = $derived(
		isWiredImport && parsedRowCount > 0 && !parseErrorMessage && !parsing,
	);
	const canStartStudentImport = $derived(canImportValidatedStudents(studentValidationResult));
	const canStartClassImport = $derived(canImportValidatedClasses(classValidationResult));
	const canStartGuardianImport = $derived(canImportValidatedGuardians(guardianValidationResult));
	const canStartImport = $derived.by(() => {
		if (isStudentsImport) {
			return canStartStudentImport;
		}
		if (isClassesImport) {
			return canStartClassImport;
		}
		if (isGuardiansImport) {
			return canStartGuardianImport;
		}
		return false;
	});
	const activeValidationResult = $derived.by(() => {
		if (isStudentsImport) {
			return studentValidationResult;
		}
		if (isClassesImport) {
			return classValidationResult;
		}
		return guardianValidationResult;
	});
	const activeValidRowCount = $derived(activeValidationResult?.validRows.length ?? 0);
	const studentValidationIssues = $derived([
		...(studentValidationResult?.errors ?? []),
		...(studentValidationResult?.warnings ?? []),
	]);
	const classValidationIssues = $derived([
		...(classValidationResult?.errors ?? []),
		...(classValidationResult?.warnings ?? []),
	]);
	const guardianValidationIssues = $derived([
		...(guardianValidationResult?.errors ?? []),
		...(guardianValidationResult?.warnings ?? []),
	]);
	const showStudentsPrerequisite = $derived(
		isStudentsImport && step === 'download' && !hasClasses,
	);
	const showGuardiansPrerequisite = $derived(
		isGuardiansImport && step === 'download' && !hasStudents,
	);

	function resetWizard() {
		step = 'download';
		selectedFileName = '';
		studentParsedRows = [];
		classParsedRows = [];
		guardianParsedRows = [];
		parseErrorMessage = '';
		parsing = false;
		studentValidationResult = null;
		classValidationResult = null;
		guardianValidationResult = null;
		importing = false;
		importProgress = { current: 0, total: 0 };
		studentImportResult = null;
		classImportResult = null;
		guardianImportResult = null;
		importFatalError = '';
		studentMatriculeIndex = new Map();
		existingMatricules = new Set();
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (next) {
			selectedImportType = initialImportType;
			resetWizard();
			void loadStudentMatriculeDataIfNeeded();
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
		void loadStudentMatriculeDataIfNeeded();
	}

	function stepIndex(value: ImportStep): number {
		return STEPS.indexOf(value);
	}

	function formatParseError(message: string): string {
		let keyMap = STUDENT_PARSE_ERROR_KEYS;
		if (isGuardiansImport) {
			keyMap = GUARDIAN_PARSE_ERROR_KEYS;
		}
		else if (isClassesImport) {
			keyMap = CLASS_PARSE_ERROR_KEYS;
		}
		const key = keyMap[message];
		return key ? get(t)(key) : message;
	}

	function clearParsedState() {
		studentParsedRows = [];
		classParsedRows = [];
		guardianParsedRows = [];
		parseErrorMessage = '';
		studentValidationResult = null;
		classValidationResult = null;
		guardianValidationResult = null;
	}

	async function loadStudentMatriculeDataIfNeeded() {
		if (!isStudentsImport && !isGuardiansImport) {
			return;
		}
		if (loadingMatricules || studentMatriculeIndex.size > 0) {
			return;
		}
		loadingMatricules = true;
		try {
			studentMatriculeIndex = await loadStudentMatriculeIndex();
			existingMatricules = new Set(studentMatriculeIndex.keys());
		}
		catch {
			studentMatriculeIndex = new Map();
			existingMatricules = new Set();
		}
		finally {
			loadingMatricules = false;
		}
	}

	function runValidation() {
		if (isStudentsImport) {
			studentValidationResult = validateStudentImportRows(studentParsedRows, {
				classes: academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					name: classGroup.name,
				})),
				existingMatricules,
			});
			return;
		}

		if (isClassesImport) {
			classValidationResult = validateClassImportRows(classParsedRows, {
				gradeLevels: academicContext.gradeLevels.map(gradeLevel => ({
					id: gradeLevel.id,
					name: gradeLevel.name,
				})),
				existingClasses: academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					name: classGroup.name,
					gradeLevelId: classGroup.gradeLevelId,
				})),
			});
			return;
		}

		if (isGuardiansImport) {
			guardianValidationResult = validateGuardianImportRows(guardianParsedRows, {
				studentMatricules: studentMatriculeIndex,
			});
		}
	}

	async function goToValidateStep() {
		await loadStudentMatriculeDataIfNeeded();
		runValidation();
		step = 'validate';
	}

	function buildClassSiblingCounts(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const classGroup of academicContext.classes) {
			counts[classGroup.gradeLevelId] = (counts[classGroup.gradeLevelId] ?? 0) + 1;
		}
		return counts;
	}

	function buildClassNameById(): Map<string, string> {
		return new Map(academicContext.classes.map(classGroup => [classGroup.id, classGroup.name]));
	}

	async function startStudentImport() {
		if (!studentValidationResult || !canStartStudentImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		studentImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: studentValidationResult.validRows.length };
		step = 'execute';

		try {
			studentImportResult = await runStudentImport({
				schoolId,
				client: getBrowserSchoolClient(),
				rows: studentValidationResult.validRows,
				classNameById: buildClassNameById(),
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.students.importFailed');
			studentImportResult = {
				created: 0,
				failed: [],
				studentIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startClassImport() {
		if (!classValidationResult || !canStartClassImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			return;
		}

		importing = true;
		classImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: classValidationResult.validRows.length };
		step = 'execute';

		try {
			classImportResult = await runClassImport({
				schoolId,
				academicYearId,
				client: getBrowserSchoolClient(),
				rows: classValidationResult.validRows,
				existingClassIds: academicContext.classes.map(classGroup => classGroup.id),
				siblingCountByGrade: buildClassSiblingCounts(),
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.classes.importFailed');
			classImportResult = {
				created: 0,
				failed: [],
				classIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startGuardianImport() {
		if (!guardianValidationResult || !canStartGuardianImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		guardianImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: guardianValidationResult.validRows.length };
		step = 'execute';

		try {
			guardianImportResult = await runGuardianImport({
				schoolId,
				client: getBrowserSchoolClient(),
				rows: guardianValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.guardians.importFailed');
			guardianImportResult = {
				created: 0,
				failed: [],
				guardianIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startImport() {
		if (isStudentsImport) {
			await startStudentImport();
			return;
		}
		if (isClassesImport) {
			await startClassImport();
			return;
		}
		if (isGuardiansImport) {
			await startGuardianImport();
		}
	}

	async function handleFileSelected(file: File) {
		if (!isWiredImport) {
			return;
		}

		selectedFileName = file.name;
		parsing = true;
		clearParsedState();

		try {
			if (isStudentsImport) {
				const result = await parseStudentImportFile(file);
				studentParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.students.emptyFile');
				}
			}
			else if (isClassesImport) {
				const result = await parseClassImportFile(file);
				classParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.classes.emptyFile');
				}
			}
			else if (isGuardiansImport) {
				const result = await parseGuardianImportFile(file);
				guardianParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.guardians.emptyFile');
				}
			}
		}
		catch {
			let unsupportedFormatKey = 'import.students.unsupportedFormat';
			if (isGuardiansImport) {
				unsupportedFormatKey = 'import.guardians.unsupportedFormat';
			}
			else if (isClassesImport) {
				unsupportedFormatKey = 'import.classes.unsupportedFormat';
			}
			parseErrorMessage = get(t)(unsupportedFormatKey);
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
					{:else if showGuardiansPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.guardians.prerequisiteMissing')}
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
					{:else if studentParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="student-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.students.parseSuccess', { n: studentParsedRows.length })}
							</p>

							{#if studentPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.students.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each studentPreviewRows as row (row.rowIndex)}
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
			{:else if isClassesImport && step === 'upload'}
				<section class="space-y-4" data-testid="class-import-step-upload">
					<p class="text-sm text-muted-foreground">{$t('import.classes.uploadHint')}</p>

					<ImportFileDropzone
						disabled={parsing}
						errorMessage={parseErrorMessage}
						{selectedFileName}
						onFileSelected={handleFileSelected}
					/>

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="class-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.classes.parsing')}
						</div>
					{:else if classParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="class-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.classes.parseSuccess', { n: classParsedRows.length })}
							</p>

							{#if classPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.classes.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each classPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.niveau}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isGuardiansImport && step === 'upload'}
				<section class="space-y-4" data-testid="guardian-import-step-upload">
					<p class="text-sm text-muted-foreground">{$t('import.guardians.uploadHint')}</p>

					<ImportFileDropzone
						disabled={parsing}
						errorMessage={parseErrorMessage}
						{selectedFileName}
						onFileSelected={handleFileSelected}
					/>

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="guardian-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.guardians.parsing')}
						</div>
					{:else if guardianParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="guardian-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.guardians.parseSuccess', { n: guardianParsedRows.length })}
							</p>

							{#if guardianPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.guardians.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each guardianPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.prenom} {row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.eleve_matricule}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isStudentsImport && step === 'validate' && studentValidationResult}
				<section class="space-y-4" data-testid="student-import-step-validate">
					<div class="grid gap-2 sm:grid-cols-3">
						<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
							{$t('import.students.validation.summaryReady', { n: studentValidationResult.validRows.length })}
						</p>
						<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{$t('import.students.validation.summaryErrors', { n: studentValidationResult.errors.length })}
						</p>
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.students.validation.summaryWarnings', { n: studentValidationResult.warnings.length })}
						</p>
					</div>

					<ImportValidationTable
						issues={studentValidationIssues}
						columnLabelKeys={STUDENT_COLUMN_LABEL_KEYS}
					/>
				</section>
			{:else if isClassesImport && step === 'validate' && classValidationResult}
				<section class="space-y-4" data-testid="class-import-step-validate">
					<div class="grid gap-2 sm:grid-cols-3">
						<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
							{$t('import.classes.validation.summaryReady', { n: classValidationResult.validRows.length })}
						</p>
						<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{$t('import.classes.validation.summaryErrors', { n: classValidationResult.errors.length })}
						</p>
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.classes.validation.summaryWarnings', { n: classValidationResult.warnings.length })}
						</p>
					</div>

					<ImportValidationTable
						issues={classValidationIssues}
						columnLabelKeys={CLASS_COLUMN_LABEL_KEYS}
						suggestionsKey="import.classes.validation.suggestions"
					/>
				</section>
			{:else if isGuardiansImport && step === 'validate' && guardianValidationResult}
				<section class="space-y-4" data-testid="guardian-import-step-validate">
					<div class="grid gap-2 sm:grid-cols-3">
						<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
							{$t('import.guardians.validation.summaryReady', { n: guardianValidationResult.validRows.length })}
						</p>
						<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{$t('import.guardians.validation.summaryErrors', { n: guardianValidationResult.errors.length })}
						</p>
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.guardians.validation.summaryWarnings', { n: guardianValidationResult.warnings.length })}
						</p>
					</div>

					<ImportValidationTable
						issues={guardianValidationIssues}
						columnLabelKeys={GUARDIAN_COLUMN_LABEL_KEYS}
						suggestionsKey="import.guardians.validation.suggestions"
					/>
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
					{:else if studentImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.students.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.students.resultCreated', { n: studentImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.students.resultFailed', { n: studentImportResult.failed.length })}
								</p>
							</div>

							{#if studentImportResult.created === 0 && studentImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.students.resultNothing')}</p>
							{/if}

							{#if studentImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.students.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each studentImportResult.failed as failure (failure.rowIndex + failure.studentName)}
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
			{:else if isClassesImport && step === 'execute'}
				<section class="space-y-4" data-testid="class-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.classes.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.classes.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if classImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.classes.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.classes.resultCreated', { n: classImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.classes.resultFailed', { n: classImportResult.failed.length })}
								</p>
							</div>

							{#if classImportResult.created === 0 && classImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.classes.resultNothing')}</p>
							{/if}

							{#if classImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.classes.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each classImportResult.failed as failure (failure.rowIndex + failure.className)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.className}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.classes.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isGuardiansImport && step === 'execute'}
				<section class="space-y-4" data-testid="guardian-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.guardians.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.guardians.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if guardianImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.guardians.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.guardians.resultCreated', { n: guardianImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.guardians.resultFailed', { n: guardianImportResult.failed.length })}
								</p>
							</div>

							{#if guardianImportResult.created === 0 && guardianImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.guardians.resultNothing')}</p>
							{/if}

							{#if guardianImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.guardians.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each guardianImportResult.failed as failure (failure.rowIndex + failure.guardianName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.guardianName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.guardians.resultUnexpected')}</p>
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
				{#if isWiredImport && (step === 'upload' || step === 'validate')}
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
				{#if isStudentsImport && step === 'execute' && studentImportResult}
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
				{#if isClassesImport && step === 'execute' && classImportResult}
					<Button
						onclick={() => {
							handleOpenChange(false);
							void appGoto(classesHref, { invalidateAll: true });
						}}
						data-testid="class-import-view-classes"
					>
						{$t('import.classes.viewClasses')}
					</Button>
				{/if}
				{#if isGuardiansImport && step === 'execute' && guardianImportResult}
					<Button
						onclick={() => {
							notifyGuardiansListChanged();
							handleOpenChange(false);
							void appGoto(guardiansHref, { invalidateAll: true });
						}}
						data-testid="guardian-import-view-guardians"
					>
						{$t('import.guardians.viewGuardians')}
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
				{:else if isWiredImport && step === 'upload'}
					<Button
						disabled={!canGoToValidate}
						onclick={() => void goToValidateStep()}
						data-testid="data-import-next"
					>
						{$t('common.next')}
					</Button>
				{:else if isWiredImport && step === 'validate' && activeValidationResult}
					<Button
						disabled={!canStartImport || importing}
						onclick={() => void startImport()}
						data-testid="data-import-start"
					>
						{#if importing}
							<LoaderCircle class="mr-2 size-4 animate-spin" aria-hidden="true" />
						{/if}
						{#if isStudentsImport}
							{$t('import.students.importReady', { n: activeValidRowCount })}
						{:else if isClassesImport}
							{$t('import.classes.importReady', { n: activeValidRowCount })}
						{:else}
							{$t('import.guardians.importReady', { n: activeValidRowCount })}
						{/if}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
