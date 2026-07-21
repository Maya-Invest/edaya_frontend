import { describe, expect, test } from 'bun:test';
import { buildImportReportStatusByRow } from '$lib/import/shared/import-report-status';

describe('buildImportReportStatusByRow', () => {
	test('marks blocking validation errors', () => {
		const outcomes = buildImportReportStatusByRow({
			rowIndexes: [2],
			errors: [{ rowIndex: 2, severity: 'error', messageKey: 'err' }],
			warnings: [],
			validRowIndexes: new Set(),
			phase: 'validate',
			formatIssueMessage: issue => issue.messageKey ?? '',
			issuesWithMessages: [{ rowIndex: 2, severity: 'error', messageKey: 'err' }],
		});

		expect(outcomes.get(2)?.status).toBe('error');
	});

	test('marks warnings on valid rows', () => {
		const outcomes = buildImportReportStatusByRow({
			rowIndexes: [3],
			errors: [],
			warnings: [{ rowIndex: 3, severity: 'warning', messageKey: 'warn' }],
			validRowIndexes: new Set([3]),
			phase: 'validate',
			formatIssueMessage: issue => issue.messageKey ?? '',
			issuesWithMessages: [{ rowIndex: 3, severity: 'warning', messageKey: 'warn' }],
		});

		expect(outcomes.get(3)?.status).toBe('warning');
	});

	test('marks import failures as errors after execute', () => {
		const outcomes = buildImportReportStatusByRow({
			rowIndexes: [4],
			errors: [],
			warnings: [],
			validRowIndexes: new Set([4]),
			importFailedByRowIndex: new Map([[4, 'API failed']]),
			phase: 'execute',
			formatIssueMessage: () => '',
			issuesWithMessages: [],
		});

		expect(outcomes.get(4)?.status).toBe('error');
		expect(outcomes.get(4)?.messages).toContain('API failed');
	});

	test('marks import warnings as warning status after execute', () => {
		const outcomes = buildImportReportStatusByRow({
			rowIndexes: [5],
			errors: [],
			warnings: [],
			validRowIndexes: new Set([5]),
			importWarningByRowIndex: new Map([[5, 'Enrolled without class']]),
			phase: 'execute',
			formatIssueMessage: () => '',
			issuesWithMessages: [],
		});

		expect(outcomes.get(5)?.status).toBe('warning');
		expect(outcomes.get(5)?.messages).toContain('Enrolled without class');
	});
});
