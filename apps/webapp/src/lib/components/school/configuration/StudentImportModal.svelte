<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import ImportFileDropzone from '$lib/components/school/configuration/ImportFileDropzone.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { parseStudentImportFile } from '$lib/import/students/parser';
	import {
		downloadStudentImportCsvTemplate,
		downloadStudentImportExcelTemplate,
	} from '$lib/import/students/template';
	import { STUDENT_IMPORT_COLUMNS, type StudentImportColumnKey, type StudentImportRow } from '$lib/import/students/types';
	import { t } from '$lib/i18n';
	import { Download, FileSpreadsheet, LoaderCircle } from '$lib/icons';
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

	const COLUMN_LABEL_KEYS: Record<StudentImportColumnKey, string> = {
		prenom: 'import.students.columns.prenom',
		nom: 'import.students.columns.nom',
		classe: 'import.students.columns.classe',
		date_naissance: 'import.students.columns.date_naissance',
		genre: 'import.students.columns.genre',
		matricule: 'import.students.columns.matricule',
	};

	const PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.students.unsupportedFormat',
		file_too_large: 'import.students.fileTooLarge',
		empty_file: 'import.students.emptyFile',
	};

	let {
		open = $bindable(false),
	}: {
		open?: boolean;
	} = $props();

	let step = $state<ImportStep>('download');
	let selectedFileName = $state('');
	let parsedRows = $state<StudentImportRow[]>([]);
	let parseErrorMessage = $state('');
	let parsing = $state(false);

	const hasClasses = $derived(academicContext.classes.length > 0);
	const previewRows = $derived(parsedRows.slice(0, 3));
	const canGoToUpload = $derived(hasClasses);

	function resetWizard() {
		step = 'download';
		selectedFileName = '';
		parsedRows = [];
		parseErrorMessage = '';
		parsing = false;
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (!next) {
			resetWizard();
		}
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
	}

	async function handleFileSelected(file: File) {
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
	<Dialog.Content class="max-w-xl" data-testid="student-import-modal">
		<Dialog.Header>
			<Dialog.Title>{$t('import.students.modalTitle')}</Dialog.Title>
			<Dialog.Description>{$t('import.students.modalDescription')}</Dialog.Description>
		</Dialog.Header>

		<ol class="mb-5 flex flex-wrap gap-2" aria-label={$t('import.students.modalTitle')}>
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

		{#if step === 'download'}
			<section class="space-y-4" data-testid="student-import-step-download">
				{#if !hasClasses}
					<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
						{$t('import.students.prerequisiteMissing')}
					</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						{$t('import.students.templateHint')}
					</p>
				{/if}

				<div class="flex flex-wrap gap-2">
					<Button
						variant="outline"
						class="justify-center"
						onclick={() => downloadStudentImportCsvTemplate()}
						data-testid="student-import-download-csv-template"
					>
						<Download class="mr-2 size-4" aria-hidden="true" />
						{$t('import.students.downloadCsvTemplate')}
					</Button>
					<Button
						class="justify-center"
						onclick={() => downloadStudentImportExcelTemplate()}
						data-testid="student-import-download-excel-template"
					>
						<FileSpreadsheet class="mr-2 size-4" aria-hidden="true" />
						{$t('import.students.downloadExcelTemplate')}
					</Button>
				</div>

				<div class="rounded-xl border border-border bg-secondary/20 p-4">
					<h3 class="mb-3 text-sm font-semibold">{$t('import.students.columnsTitle')}</h3>
					<ul class="space-y-2 text-sm">
						{#each STUDENT_IMPORT_COLUMNS as column (column.key)}
							<li class="flex items-start justify-between gap-3">
								<span>
									<span class="font-mono text-xs text-muted-foreground">{column.key}</span>
									<span class="mx-2 text-muted-foreground">·</span>
									<span>{$t(COLUMN_LABEL_KEYS[column.key])}</span>
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
		{:else if step === 'upload'}
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
		{/if}

		<Dialog.Footer class="gap-2 sm:justify-between">
			<div class="flex gap-2">
				{#if step === 'upload'}
					<Button variant="outline" onclick={() => (step = 'download')} data-testid="student-import-back">
						{$t('common.back')}
					</Button>
				{/if}
			</div>
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => handleOpenChange(false)}>
					{$t('common.close')}
				</Button>
				{#if step === 'download'}
					<Button
						disabled={!canGoToUpload}
						onclick={() => (step = 'upload')}
						data-testid="student-import-next"
					>
						{$t('common.next')}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
