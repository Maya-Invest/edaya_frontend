export type ImportReportRowStatus = 'success' | 'warning' | 'error';

export interface ImportReportIssueLike {
	rowIndex: number;
	severity?: 'error' | 'warning';
}

export interface ImportReportRowOutcome {
	status: ImportReportRowStatus;
	messages: string[];
}

export interface BuildImportReportStatusInput {
	rowIndexes: readonly number[];
	errors: readonly ImportReportIssueLike[];
	warnings: readonly ImportReportIssueLike[];
	validRowIndexes: ReadonlySet<number>;
	importFailedByRowIndex?: ReadonlyMap<number, string>;
	importWarningByRowIndex?: ReadonlyMap<number, string>;
	phase: 'validate' | 'execute';
	formatIssueMessage: (issue: ImportReportIssueLike & {
		messageKey: string;
		messageParams?: Record<string, string | number>;
		suggestions?: string[];
	}) => string;
	issuesWithMessages: readonly (ImportReportIssueLike & {
		messageKey: string;
		messageParams?: Record<string, string | number>;
		suggestions?: string[];
	})[];
}

function issuesForRow<T extends ImportReportIssueLike>(
	rowIndex: number,
	issues: readonly T[],
): T[] {
	return issues.filter(issue => issue.rowIndex === rowIndex);
}

export function buildImportReportStatusByRow(
	input: BuildImportReportStatusInput,
): Map<number, ImportReportRowOutcome> {
	const outcomes = new Map<number, ImportReportRowOutcome>();

	for (const rowIndex of input.rowIndexes) {
		const rowErrors = issuesForRow(rowIndex, input.errors);
		const rowWarnings = issuesForRow(rowIndex, input.warnings);
		const importFailure = input.importFailedByRowIndex?.get(rowIndex);
		const importWarning = input.importWarningByRowIndex?.get(rowIndex);
		const messages: string[] = [];

		for (const entry of input.issuesWithMessages.filter(issue => issue.rowIndex === rowIndex)) {
			messages.push(input.formatIssueMessage(entry));
		}
		if (importFailure) {
			messages.push(importFailure);
		}
		if (importWarning) {
			messages.push(importWarning);
		}

		let status: ImportReportRowStatus;

		if (rowErrors.length > 0 || importFailure) {
			status = 'error';
		}
		else if (!input.validRowIndexes.has(rowIndex)) {
			status = 'error';
			if (messages.length === 0) {
				messages.push('');
			}
		}
		else if (rowWarnings.length > 0 || importWarning) {
			status = 'warning';
		}
		else if (input.phase === 'execute') {
			status = 'success';
		}
		else {
			status = 'success';
		}

		outcomes.set(rowIndex, {
			status,
			messages: [...new Set(messages.filter(message => message.length > 0))],
		});
	}

	return outcomes;
}
