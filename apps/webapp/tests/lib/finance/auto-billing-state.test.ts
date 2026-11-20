import type { FeeAutoBillingState } from '../../../src/routes/(app)/finance/fees/lib/auto-billing-state.svelte';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as schoolClient from '$lib/api/school-client';
import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

const sourcePath = resolve('src/routes/(app)/finance/fees/lib/auto-billing-state.svelte.ts');
const compiledPath = resolve(`.svelte-kit/auto-billing-state-test-${process.pid}.mjs`);
let State: typeof FeeAutoBillingState;
beforeAll(async () => {
	const source = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(sourcePath).text());
	await Bun.write(compiledPath, compileModule(source, { filename: sourcePath, generate: 'server' }).js.code);
	State = (await import(compiledPath)).FeeAutoBillingState;
});
afterAll(async () => {
	await unlink(compiledPath);
});
async function flush() {
	for (let i = 0; i < 10; i++)
		await Promise.resolve();
}

test('fee navigation discards an old progress response and disconnect stops publication', async () => {
	let finish!: (value: unknown) => void;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ commands: {
		getAutoBillingOptions: async () => ({ canConfigureAutomatic: true, gradeLevels: [], placementStatuses: [] }),
		getFeeAutoBilling: async ({ catalogServiceId }: { catalogServiceId: string }) => catalogServiceId === 'old'
			? new Promise((resolve) => { finish = resolve; })
			: { runs: [{ id: 'new-run', status: 'completed', createdCount: 1, skippedCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01' }] },
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = new State();
	let stop = () => {};
	try {
		const stopOld = state.watch('old');
		await flush();
		stopOld();
		stop = state.watch('new');
		await flush();
		expect(state.runs[0]?.id).toBe('new-run');
		finish({ runs: [] });
		await flush();
		expect(state.runs[0]?.id).toBe('new-run');
		expect(state.status).toBe('ready');
	}
	finally {
		stop();
		spy.mockRestore();
	}
});

test('failed progress reads stay errors rather than appearing as zero completed charges', async () => {
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ commands: {
		getAutoBillingOptions: async () => ({ canConfigureAutomatic: false, gradeLevels: [], placementStatuses: [] }),
		getFeeAutoBilling: async () => { throw new Error('unavailable'); },
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = new State();
	const stop = state.watch('fee');
	try {
		await flush();
		expect(state.status).toBe('error');
		expect(state.options?.canConfigureAutomatic).toBe(false);
	}
	finally {
		stop();
		spy.mockRestore();
	}
});

test('first observed completion refreshes totals once, including work completed before the detail opens', async () => {
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ commands: {
		getAutoBillingOptions: async () => ({ canConfigureAutomatic: true, gradeLevels: [], placementStatuses: [] }),
		getFeeAutoBilling: async () => ({ runs: [{ id: 'run', status: 'completed', createdCount: 5, skippedCount: 0, createdAt: '2026-01-01', updatedAt: '2026-01-01' }] }),
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const { entityVersions } = await import('$lib/entity-versions.svelte');
	const bump = spyOn(entityVersions, 'bump');
	const state = new State();
	let stop = state.watch('fee');
	try {
		await flush();
		expect(bump.mock.calls.map(call => call[0])).toEqual(['fees', 'billing', 'payments']);
		stop();
		stop = state.watch('fee');
		await flush();
		expect(bump).toHaveBeenCalledTimes(3);
	}
	finally {
		stop();
		spy.mockRestore();
		bump.mockRestore();
	}
});

test('switching the signed-in user discards pending option responses', async () => {
	let finish!: (value: unknown) => void;
	const { authSession } = await import('$lib/auth/session.svelte');
	const originalUser = authSession.userId;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ commands: {
		getAutoBillingOptions: async () => new Promise((resolve) => { finish = resolve; }),
		getFeeAutoBilling: async () => ({ runs: [] }),
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = new State();
	const pending = state.loadOptions();
	try {
		authSession.userId = 'different-user';
		finish({ canConfigureAutomatic: true, gradeLevels: [], placementStatuses: [] });
		await pending;
		expect(state.options).toBeNull();
	}
	finally {
		authSession.userId = originalUser;
		spy.mockRestore();
	}
});
