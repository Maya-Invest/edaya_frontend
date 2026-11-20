import { beforeEach, expect, mock, test } from 'bun:test';
import type { AppShellData } from '$lib/api/shell-data';
import { ApiError } from '@maya-invest/edaya-api-client';

const authSession = { sessionKind: 'staff', schoolId: 'school-a', userId: 'staff-a' };
const academicContext = { shellReady: false, yearId: '', clearShellCatalog: mock(() => {}), initFromShell: mock((_shell: AppShellData) => {}) };
let load: () => Promise<AppShellData>;
mock.module('$lib/auth/session.svelte', () => ({ authSession }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext }));
mock.module('$lib/api/school-client', () => ({ configureBrowserSchoolClient: () => {} }));
mock.module('$lib/auth/bootstrap', () => ({ resetBootstrapSession: () => {} }));
mock.module('$lib/queries/page-query-status.svelte', () => ({ pageQueryStatus: { reset: () => {} } }));
mock.module('$lib/queries/shell.queries', () => ({ getAppShellData: () => load() }));
const { bootstrapAppShell, resetAppShellBootstrap, invalidateAppShellBootstrapCache } = await import('$lib/auth/bootstrap-app');

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
	return { promise, resolve, reject };
}
function shell(id: string) {
	return { schools: [{ id }], academicYears: [{ id: `${id}-year` }] } as AppShellData;
}
beforeEach(() => {
	resetAppShellBootstrap();
	authSession.schoolId = 'school-a';
	authSession.userId = 'staff-a';
	academicContext.initFromShell.mockClear();
});

for (const outcome of ['success', 'failure'] as const) {
	test(`a late ${outcome} from the previous school cannot overwrite the active shell`, async () => {
		const previous = deferred<AppShellData>();
		load = () => previous.promise;
		const oldRun = bootstrapAppShell();
		authSession.schoolId = 'school-b';
		authSession.userId = 'staff-b';
		resetAppShellBootstrap();
		const current = shell('school-b');
		load = async () => current;
		await bootstrapAppShell();
		if (outcome === 'success') previous.resolve(shell('school-a'));
		else previous.reject(new Error('obsolete request failed'));
		await oldRun;
		expect(academicContext.initFromShell.mock.calls).toEqual([[current]]);
	});
}

test('invalidation discards an older load even when the school identity is unchanged', async () => {
	const previous = deferred<AppShellData>();
	load = () => previous.promise;
	const oldRun = bootstrapAppShell();
	invalidateAppShellBootstrapCache();
	const current = shell('school-a');
	load = async () => current;
	await bootstrapAppShell();
	previous.resolve(shell('old-revision'));
	await oldRun;
	expect(academicContext.initFromShell.mock.calls).toEqual([[current]]);
});

test('a valid empty catalog is published once for all bootstrap callers', async () => {
	const empty = { schools: [], academicYears: [] } as unknown as AppShellData;
	const read = mock(async () => empty);
	load = read;
	await Promise.all([bootstrapAppShell(), bootstrapAppShell()]);
	expect(read).toHaveBeenCalledTimes(1);
	expect(academicContext.initFromShell.mock.calls).toEqual([[empty]]);
});

test('a transient catalog failure has one shared retry', async () => {
	const current = shell('school-a');
	let attempts = 0;
	load = async () => {
		if (++attempts === 1)
			throw new ApiError(503, {});
		return current;
	};
	await Promise.all([bootstrapAppShell(), bootstrapAppShell()]);
	expect(attempts).toBe(2);
	expect(academicContext.initFromShell.mock.calls).toEqual([[current]]);
});

test.each([403, 503])('a terminal %i can be retried after failure without publishing a false empty catalog', async (status) => {
	const read = mock(async () => { throw new ApiError(status, {}); });
	load = read;
	await expect(bootstrapAppShell()).rejects.toMatchObject({ status });
	expect(read).toHaveBeenCalledTimes(status === 403 ? 1 : 2);
	expect(academicContext.initFromShell).not.toHaveBeenCalled();
	const current = shell('school-a');
	load = async () => current;
	await bootstrapAppShell();
	expect(academicContext.initFromShell.mock.calls).toEqual([[current]]);
});

test('a school change during the retry delay discards the old error and skips its next read', async () => {
	const failing = mock(async () => { throw new ApiError(502, {}); });
	load = failing;
	const previous = bootstrapAppShell();
	await Promise.resolve();
	authSession.schoolId = 'school-b';
	const current = shell('school-b');
	load = async () => current;
	await bootstrapAppShell();
	await previous;
	expect(failing).toHaveBeenCalledTimes(1);
	expect(academicContext.initFromShell.mock.calls).toEqual([[current]]);
});

test('an offline transport failure waits for an explicit retry', async () => {
	const previous = Object.getOwnPropertyDescriptor(navigator, 'onLine');
	Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
	try {
		const read = mock(async () => { throw new TypeError('Offline'); });
		load = read;
		await expect(bootstrapAppShell()).rejects.toThrow('Offline');
		expect(read).toHaveBeenCalledTimes(1);
		expect(academicContext.initFromShell).not.toHaveBeenCalled();
	}
	finally {
		if (previous)
			Object.defineProperty(navigator, 'onLine', previous);
		else
			Reflect.deleteProperty(navigator, 'onLine');
	}
});
