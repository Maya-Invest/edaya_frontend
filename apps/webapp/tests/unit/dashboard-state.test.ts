import type { DashboardPageState } from '../../src/routes/(app)/dashboard/dashboard-page.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { plugin } from 'bun';
import { beforeEach, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'dashboard-runes', setup(build) {
	build.onLoad({ filter: /dashboard-page\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });

let year: string | null = 'year';
let period: string | null = null;
let error: Error | undefined;
let delay: Promise<void> | undefined;
let transportSignal: AbortSignal | undefined;
let onRequestStart: (() => void) | undefined;
const requests: unknown[] = [];
const response = { academicYearId: 'year', academicPeriodId: null, kpis: { studentCount: 1144 } };
const versions = new Proxy<Record<string, number>>({}, {
	get: (target, key) => typeof key === 'string' ? target[key] ?? 0 : undefined,
});
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: versions }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext: {
	resolveAcademicYearIdForApi: () => year,
	resolveSelectionForApi: () => year && period ? { academicYearId: year, academicPeriodId: period } : null,
} }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { schoolId: 'school' } }));
mock.module('$lib/queries/client', () => ({ queryClient: () => ({ queries: {
	getSchoolOverview: async (input: unknown, options?: { signal?: AbortSignal }) => {
		transportSignal = options?.signal;
		onRequestStart?.();
		requests.push(input);
		await delay;
		if (error) throw error;
		return response;
	},
} }) }));
mock.module('$lib/auth/bootstrap-app', () => ({ bootstrapAppShell: async () => {} }));
const { queryDashboardListPage } = await import('../../src/routes/(app)/dashboard/lib/dashboard-queries');
const { DashboardPageState: DashboardState } = await import('../../src/routes/(app)/dashboard/dashboard-page.svelte');
const url = new URL('http://localhost/dashboard');
function owner() {
	const applySlice = mock(() => {});
	const clear = mock(() => {});
	return { applySlice, clear, query: queryDashboardListPage({ applySlice, clear } as unknown as DashboardPageState) };
}
beforeEach(() => {
	year = 'year'; period = null; error = undefined; delay = undefined; requests.length = 0;
	transportSignal = undefined; onRequestStart = undefined;
	for (const key of Object.keys(versions)) delete versions[key];
});

test.each(['schoolYearEvents', 'billing', 'fees', 'payments', 'evaluations', 'reportCards'])('dashboard refreshes after %s changes and does not refetch unchanged data', async (family) => {
	const state = new DashboardState();
	await state.refreshSlice();
	expect(requests).toHaveLength(1);
	await state.invalidateIfStale();
	expect(requests).toHaveLength(1);
	versions[family] = 1;
	await state.invalidateIfStale();
	expect(requests).toHaveLength(2);
	await state.invalidateIfStale();
	expect(requests).toHaveLength(2);
});

test('a year without periods requests the overview and preserves its real counts', async () => {
	const state = owner();
	const result = await state.query(url);
	expect(result.status).toBe('ready');
	expect(result.overview?.kpis.studentCount).toBe(1144);
	expect(requests).toEqual([{ schoolId: 'school', academicYearId: 'year' }]);
	expect(state.clear).toHaveBeenCalledTimes(1);
});
test('a configured period is included; a missing year is explicitly empty', async () => {
	period = 'period';
	await owner().query(url);
	expect(requests).toEqual([{ schoolId: 'school', academicYearId: 'year', academicPeriodId: 'period' }]);
	year = null;
	expect((await owner().query(url)).status).toBe('empty');
	expect(requests).toHaveLength(1);
});
test.each([401, 403, 422, 503])('HTTP %i stays visible and can recover on retry', async (status) => {
	const state = owner();
	error = new ApiError(status, {});
	expect((await state.query(url)).status).toBe(status === 401 || status === 403 ? 'denied' : 'error');
	expect(state.applySlice).not.toHaveBeenCalled();
	error = undefined;
	expect((await state.query(url)).status).toBe('ready');
	expect(state.applySlice).toHaveBeenCalledTimes(1);
});
test('a response from an aborted school/year scope cannot seed the dashboard', async () => {
	let release!: () => void;
	delay = new Promise<void>(resolve => { release = resolve; });
	const state = owner();
	const controller = new AbortController();
	const started = new Promise<void>(resolve => { onRequestStart = resolve; });
	const pending = state.query(url, { signal: controller.signal });
	await started;
	expect(transportSignal).toBe(controller.signal);
	controller.abort();
	release();
	await expect(pending).rejects.toThrow();
	expect(state.applySlice).not.toHaveBeenCalled();
});
