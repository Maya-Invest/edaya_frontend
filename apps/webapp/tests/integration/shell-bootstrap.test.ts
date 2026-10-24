import { beforeEach, expect, mock, test } from 'bun:test';
import type { AppShellData } from '$lib/api/shell-data';

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
