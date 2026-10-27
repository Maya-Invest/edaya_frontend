import type { DashboardPageState } from '../../src/routes/(app)/dashboard/dashboard-page.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { beforeEach, expect, mock, test } from 'bun:test';

let year: string | null = 'year';
let period: string | null = null;
let error: Error | undefined;
let delay: Promise<void> | undefined;
const requests: unknown[] = [];
const response = { academicYearId: 'year', academicPeriodId: null, kpis: { studentCount: 1144 } };
mock.module('$lib/academic/context.svelte', () => ({ academicContext: {
	resolveAcademicYearIdForApi: () => year,
	resolveSelectionForApi: () => year && period ? { academicYearId: year, academicPeriodId: period } : null,
} }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { schoolId: 'school' } }));
mock.module('$lib/queries/client', () => ({ queryClient: () => ({ queries: {
	getSchoolOverview: async (input: unknown) => {
		requests.push(input);
		await delay;
		if (error) throw error;
		return response;
	},
} }) }));
mock.module('$lib/auth/bootstrap-app', () => ({ bootstrapAppShell: async () => {} }));
const { queryDashboardListPage } = await import('../../src/routes/(app)/dashboard/lib/dashboard-queries');
const url = new URL('http://localhost/dashboard');
function owner() {
	const applySlice = mock(() => {});
	const clear = mock(() => {});
	return { applySlice, clear, query: queryDashboardListPage({ applySlice, clear } as unknown as DashboardPageState) };
}
beforeEach(() => { year = 'year'; period = null; error = undefined; delay = undefined; requests.length = 0; });

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
	const pending = state.query(url, { signal: controller.signal });
	await Promise.resolve();
	controller.abort();
	release();
	await expect(pending).rejects.toThrow();
	expect(state.applySlice).not.toHaveBeenCalled();
});
