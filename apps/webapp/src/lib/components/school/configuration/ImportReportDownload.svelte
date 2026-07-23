<script lang="ts">
	import type { ImportTypeDefinition } from '$lib/import/catalog/types';
	import {
		buildImportReportStatusByRow,
		type ImportReportIssueLike,
	} from '$lib/import/shared/import-report-status';
	import {
		downloadImportReportCsv,
		downloadImportReportExcel,
		filterImportReportErrorRows,
		type ImportReportDownloadLabels,
	} from '$lib/import/shared/import-report-download';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { Download, FileSpreadsheet } from '$lib/icons';
	import { get } from 'svelte/store';

	export interface ImportReportIssue extends ImportReportIssueLike {
		messageKey: string;
		messageParams?: Record<string, string | number>;
		suggestions?: string[];
	}

	const {
		definition,
		rows,
		errors = [],
		warnings = [],
		validRowIndexes,
		importFailures = [],
		importWarnings = [],
		phase,
		suggestionsKey = 'import.students.validation.suggestions',
		filenameBase,
	}: {
		definition: ImportTypeDefinition;
		rows: readonly { rowIndex: number }[];
		errors?: readonly ImportReportIssue[];
		warnings?: readonly ImportReportIssue[];
		validRowIndexes: ReadonlySet<number>;
		importFailures?: readonly { rowIndex: number; message: string }[];
		importWarnings?: readonly { rowIndex: number; message: string }[];
		phase: 'validate' | 'execute';
		suggestionsKey?: string;
		filenameBase: string;
	} = $props();

	const columnKeys = $derived(definition.columns.map(column => column.key));

	function formatIssueMessage(issue: ImportReportIssue): string {
		let message = get(t)(issue.messageKey, issue.messageParams ?? {});
		if (issue.suggestions?.length) {
			message = `${message} ${get(t)(suggestionsKey, { values: issue.suggestions.join(', ') })}`;
		}
		return message;
	}

	function reportInput() {
		const importFailedByRowIndex = new Map(
			importFailures.map(failure => [failure.rowIndex, failure.message]),
		);
		const importWarningByRowIndex = new Map(
			importWarnings.map(warning => [warning.rowIndex, warning.message]),
		);
		const statusByRowIndex = buildImportReportStatusByRow({
			rowIndexes: rows.map(row => row.rowIndex),
			errors,
			warnings,
			validRowIndexes,
			importFailedByRowIndex,
			importWarningByRowIndex,
			phase,
			formatIssueMessage,
			issuesWithMessages: [...errors, ...warnings],
		});
		const errorRows = filterImportReportErrorRows(rows, statusByRowIndex);

		return {
			columnKeys,
			rows: errorRows,
			getColumnValue: (row: { rowIndex: number }, key: string) => {
				const record = row as Record<string, unknown>;
				const value = record[key];
				return value == null ? '' : String(value);
			},
			statusByRowIndex,
			labels: {
				statusHeader: get(t)('import.report.column.status'),
				messageHeader: get(t)('import.report.column.message'),
				success: get(t)('import.report.status.success'),
				warning: get(t)('import.report.status.warning'),
				error: get(t)('import.report.status.error'),
			} satisfies ImportReportDownloadLabels,
			filenameBase,
		};
	}

	const errorRowCount = $derived.by(() => reportInput().rows.length);

	function downloadCsvReport() {
		downloadImportReportCsv(reportInput());
	}

	async function downloadExcelReport() {
		await downloadImportReportExcel(reportInput());
	}
</script>

{#if errorRowCount > 0}
	<div class="flex flex-wrap gap-2 border-t border-border pt-4">
		<Button variant="outline" size="sm" class="justify-center" onclick={downloadCsvReport} data-testid="import-report-download-csv">
			<Download class="mr-2 size-4" aria-hidden="true" />
			{$t('import.report.downloadCsv')}
		</Button>
		<Button size="sm" class="justify-center" onclick={() => void downloadExcelReport()} data-testid="import-report-download-excel">
			<FileSpreadsheet class="mr-2 size-4" aria-hidden="true" />
			{$t('import.report.downloadExcel')}
		</Button>
	</div>
{/if}
