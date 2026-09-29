import { afterEach, describe, expect, mock, test } from 'bun:test';

const refreshAppShellData = mock(async () => {});
const invalidateAppShellBootstrapCache = mock(() => {});
const resetAppShellBootstrap = mock(() => {});

mock.module('$lib/auth/bootstrap-app', () => ({
	bootstrapAppShell: refreshAppShellData,
	invalidateAppShellBootstrapCache,
	resetAppShellBootstrap,
}));

const { refreshStudentImportShellContext } = await import(
	'$lib/import/students/refresh-student-import-shell-context'
);

describe('refreshStudentImportShellContext', () => {
	afterEach(() => {
		refreshAppShellData.mockReset();
		invalidateAppShellBootstrapCache.mockClear();
		resetAppShellBootstrap.mockClear();
		refreshAppShellData.mockImplementation(async () => {});
	});

	test('reloads app shell classes before student import validation', async () => {
		await refreshStudentImportShellContext();

		expect(refreshAppShellData).toHaveBeenCalledTimes(1);
		expect(invalidateAppShellBootstrapCache).toHaveBeenCalledTimes(1);
		expect(resetAppShellBootstrap).not.toHaveBeenCalled();
	});

	test('ignores shell refresh failures', async () => {
		refreshAppShellData.mockImplementation(async () => {
			throw new Error('network');
		});

		await expect(refreshStudentImportShellContext()).resolves.toBeUndefined();
	});
});
