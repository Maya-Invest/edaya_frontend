import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { beforeEach, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'entry-and-quick-login-runes', setup(builder) {
	builder.onLoad({ filter: /(?:root-entry|teacher-quick-login)-state\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => { resolve = done; });
	return { promise, resolve };
}

type Session = { data: { session: object } | null; error: { status: number } | null };
let session: () => Promise<Session>;
const destinations: string[] = [];
let completions = 0;
const scope = { scopeGeneration: 0, yearId: 'year' };
const options = { contacts: [{ id: 'contact', channel: 'sms' as const, hint: '***1234' }], expiries: { week: 1000 }, active: null };
let load: () => Promise<typeof options>;
let issue: (body: { requestId: string }) => Promise<{ status: string }>;
const requests: string[] = [];
mock.module('$app/environment', () => ({ dev: false }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext: scope }));
mock.module('$lib/api/browser-transport', () => ({ createBrowserTransport: () => ({ request: async () => ({ code: 'unused' }) }) }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ authorization: {
	teacherQuickCodeOptions: () => load(),
	issueTeacherQuickCode: (_target: unknown, body: { requestId: string }) => issue(body),
} }) }));
mock.module('$lib/auth/client', () => ({ authClient: { getSession: () => session() }, authRequest: async () => ({ data: null }) }));
mock.module('$lib/auth/complete-sign-in', () => ({ completeAuthSignIn: async () => { completions++; return true; } }));
mock.module('$lib/navigation/app-navigation', () => ({ appPath: (path: string) => path, appGoto: async (path: string) => { destinations.push(path); } }));
mock.module('$lib/env/app-env', () => ({ isLocalDevApi: () => false }));

const { RootEntryState } = await import('../../src/routes/root-entry-state.svelte');
const { TeacherQuickLoginState } = await import('../../src/routes/(app)/school/teachers/[[id]]/(tabs)/profile/teacher-quick-login-state.svelte');

beforeEach(() => {
	session = async () => ({ data: null, error: null });
	load = async () => options;
	issue = async (body) => { requests.push(body.requestId); return { status: 'active' }; };
	destinations.length = 0;
	requests.length = 0;
	completions = 0;
	scope.scopeGeneration = 0;
});

test('root entry preserves anonymous, signed-in and retry behavior', async () => {
	const state = new RootEntryState();
	await state.enterApp();
	expect(destinations).toEqual(['/login']);
	session = async () => ({ data: null, error: { status: 503 } });
	await state.enterApp();
	expect(state.failed).toBe(true);
	session = async () => ({ data: { session: {} }, error: null });
	await state.enterApp();
	expect(state.failed).toBe(false);
	expect(completions).toBe(1);
});

test('root entry ignores a session response after unmount', async () => {
	const pending = deferred<Session>();
	session = () => pending.promise;
	const state = new RootEntryState();
	const entering = state.enterApp();
	state.dispose();
	pending.resolve({ data: null, error: null });
	await entering;
	expect(destinations).toEqual([]);
});

test('quick login retains request identity after failure and refreshes after success', async () => {
	const state = new TeacherQuickLoginState('teacher');
	state.identifierId = 'contact';
	state.show();
	issue = async (body) => { requests.push(body.requestId); throw new Error('offline'); };
	await state.issue();
	expect(state.open).toBe(true);
	expect(state.busy).toBe(false);
	issue = async (body) => { requests.push(body.requestId); return { status: 'active' }; };
	await state.issue();
	expect(requests[1]).toBe(requests[0]);
	expect(state.notice).toBe('quick.sent');
	expect(state.open).toBe(false);
	expect(state.options).toEqual(options);
	state.dispose();
});

test('quick login discards an old scope response and prevents stale writes', async () => {
	const pending = deferred<typeof options>();
	load = () => pending.promise;
	const state = new TeacherQuickLoginState('teacher');
	state.start();
	scope.scopeGeneration++;
	pending.resolve(options);
	await Promise.resolve();
	expect(state.options).toBeUndefined();
	await state.issue();
	expect(requests).toEqual([]);
	state.dispose();
});
