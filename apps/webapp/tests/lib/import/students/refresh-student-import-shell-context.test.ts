import { afterEach, describe, expect, mock, test } from 'bun:test';

const refreshAppShellData = mock(async () => {});

mock.module('$lib/api/mutations/run-mutation', () => ({
	refreshAppShellData,
}));

const { refreshStudentImportShellContext } = await import(
	'$lib/import/students/refresh-student-import-shell-context'
);

describe('refreshStudentImportShellContext', () => {
	afterEach(() => {
		refreshAppShellData.mockReset();
		refreshAppShellData.mockImplementation(async () => {});
	});

	test('reloads app shell classes before student import validation', async () => {
		await refreshStudentImportShellContext();

		expect(refreshAppShellData).toHaveBeenCalledTimes(1);
	});

	test('ignores shell refresh failures', async () => {
		refreshAppShellData.mockImplementation(async () => {
			throw new Error('network');
		});

		await expect(refreshStudentImportShellContext()).resolves.toBeUndefined();
	});
});
