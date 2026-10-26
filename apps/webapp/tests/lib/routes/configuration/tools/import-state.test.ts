import type { components } from '$lib/api/schema';
import type { DataImportState } from '../../../../../src/routes/(app)/configuration/tools/import-state.svelte';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { executeMutation } from '$lib/api/mutations/execute-mutation';
import * as schoolClient from '$lib/api/school-client';
import { ApiError } from '@maya-invest/edaya-api-client';
import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

type Detail = components['schemas']['SchoolImportDetail'];
const sourcePath = resolve('src/routes/(app)/configuration/tools/import-state.svelte.ts');
const compiledPath = resolve(`.svelte-kit/import-state-test-${process.pid}.mjs`);
let State: typeof DataImportState;
beforeAll(async () => {
	// Compile runes without rewriting production imports or implementation.
	const source = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(sourcePath).text());
	await Bun.write(compiledPath, compileModule(source, { filename: sourcePath, generate: 'server' }).js.code);
	State = (await import(compiledPath)).DataImportState;
});
afterAll(async () => {
	await unlink(compiledPath);
});
function createState(errors: string[] = []) {
	return new State({ runMutation: (request, options) => executeMutation({ ...options, request }, {
		bump: () => {},
		success: () => {},
		error: message => errors.push(message),
		translate: key => key,
	}) });
}
const detail = (id: string): Detail => ({ batch: { id, schoolId: 'school', academicYearId: 'year', createdByStaffId: 'staff', createdBySubjectId: 'subject', defaultOnExisting: 'M', enrollmentEffectiveDate: null, revision: 1, state: 'draft', previewDigest: null, workId: null, approval: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' }, files: [], rows: [], counts: {} });

test('route-owned history restores the selected batch and ignores a stale response after navigation', async () => {
	let finish!: (value: Detail) => void;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({
		imports: {
			history: async () => ({
				batches: [],
			}),
			detail: async ({
				batchId,
			}: {
				batchId: string;
			}) => batchId === 'old'
				? new Promise<Detail>((resolve) => {
						finish = resolve;
					})
				: detail(batchId),
		},
	} as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		const old = state.connect('old', 'school:user');
		await Promise.resolve();
		await state.connect('new', 'school:user');
		finish(detail('old'));
		await old;
		expect(state.detail?.batch.id).toBe('new');
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});
test('switching user clears previous private batch data even when loading the same ID fails', async () => {
	let denied = false;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({
		imports: {
			history: async () => ({
				batches: [],
			}),
			detail: async () => {
				if (denied)
					throw new Error('denied');
				return detail('batch');
			},
		},
	} as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect('batch', 'school:first-user');
		denied = true;
		await state.connect('batch', 'school:second-user');
		expect(state.detail).toBeNull();
		expect(state.error).not.toBe('');
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('a completed creation from the previous user cannot navigate the next user to its batch', async () => {
	let finish!: (value: Detail['batch']) => void;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({
		imports: {
			history: async () => ({
				batches: [],
			}),
			create: async () => new Promise<Detail['batch']>((resolve) => {
				finish = resolve;
			}),
		},
	} as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect(null, 'school:first-user');
		const creating = state.create('year', 'M', '');
		await state.connect(null, 'school:second-user');
		finish(detail('private-batch').batch);
		expect(await creating).toBeNull();
		expect(state.detail).toBeNull();
		expect(state.busy).toBe(false);
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('closing and reopening the same scope rejects the previous creation response', async () => {
	let finish!: (value: Detail['batch']) => void;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({
		imports: {
			history: async () => ({
				batches: [],
			}),
			create: async () => new Promise<Detail['batch']>((resolve) => {
				finish = resolve;
			}),
		},
	} as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect(null, 'school:same-user');
		const creating = state.create('year', 'M', '');
		state.disconnect();
		await state.connect(null, 'school:same-user');
		finish(detail('stale-batch').batch);
		expect(await creating).toBeNull();
		expect(state.detail).toBeNull();
		expect(state.busy).toBe(false);
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('a history failure does not hide an independently authorized batch', async () => {
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => { throw new ApiError(503, {}); },
		detail: async () => detail('batch'),
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect('batch', 'school:user');
		expect(state.detail?.batch.id).toBe('batch');
		expect(state.readStatus).toBe('ready');
		expect(state.historyError).not.toBe('');
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('revoked read access clears previously loaded private detail and disables execution', async () => {
	let denied = false;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => {
			if (denied)
				throw new ApiError(403, {});
			return detail('batch');
		},
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect('batch', 'school:user');
		denied = true;
		expect(await state.refresh()).toBe(false);
		expect(state.readStatus).toBe('denied');
		expect(state.detail).toBeNull();
		expect(state.canExecute).toBe(false);
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('the newest same-batch refresh wins even when an older request resolves last', async () => {
	const responses: ((value: Detail) => void)[] = [];
	let defer = false;
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => defer ? new Promise<Detail>(resolve => responses.push(resolve)) : detail('batch'),
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect('batch', 'school:user');
		defer = true;
		const older = state.refresh();
		const newer = state.refresh();
		const newest = detail('batch');
		newest.batch.revision = 3;
		responses[1]!(newest);
		expect(await newer).toBe(true);
		responses[0]!(detail('batch'));
		expect(await older).toBe(false);
		expect(state.detail?.batch.revision).toBe(3);
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('confirmed settings survive failed refresh without replaying the write or reporting failed save', async () => {
	const feedback: string[] = [];
	let writes = 0;
	let failedRead = false;
	const saved = { ...detail('batch').batch, defaultOnExisting: 'S' as const, revision: 2 };
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => {
			if (failedRead)
				throw new ApiError(503, {});
			return detail('batch');
		},
		settings: async () => {
			writes++;
			failedRead = true;
			return saved;
		},
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState(feedback);
		await state.connect('batch', 'school:user');
		expect(await state.settings('S', '')).toEqual(saved);
		expect(state.detail?.batch.defaultOnExisting).toBe('S');
		expect(state.savedRefreshFailed).toBe(true);
		expect(state.mutationError).toBe('');
		expect(feedback).toEqual(['mutation.savedRefreshFailed']);
		await state.refresh();
		expect(writes).toBe(1);
		expect(state.canExecute).toBe(false);
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('execution submits only the reviewed revision and digest, and rejects stale previews', async () => {
	const validated = detail('batch');
	validated.batch.state = 'validated';
	validated.batch.revision = 7;
	validated.batch.previewDigest = 'reviewed-digest';
	validated.rows = [{
		id: 'row',
		batchId: 'batch',
		schoolId: 'school',
		type: 'students',
		source: { fileId: 'file', revisionId: 'revision', row: 2 },
		raw: {},
		values: {},
		generatedCode: null,
		targetId: 'student',
		sourceKey: 'stable-row',
		effectiveMode: 'M',
		inputDigest: 'input',
		operationId: 'durable-operation',
		dependencies: [],
		current: null,
		proposed: { name: 'Aminata' },
		expectedDigest: null,
		issues: [],
		outcome: 'pending',
		result: null,
	}];
	const submitted: unknown[] = [];
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => validated,
		confirm: async (payload: unknown) => {
			submitted.push(payload);
			return { ...validated.batch, state: 'completed' };
		},
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	try {
		const state = createState();
		await state.connect('batch', 'school:user');
		state.previewStale = true;
		expect(await state.confirm()).toBeNull();
		expect(submitted).toHaveLength(0);
		state.previewStale = false;
		await state.confirm();
		expect(submitted).toEqual([{ batchId: 'batch', revision: 7, previewDigest: 'reviewed-digest' }]);
		state.disconnect();
	}
	finally { spy.mockRestore(); }
});

test('running polling reads metadata, preserves row snapshots, and loads final details once', async () => {
	let fullReads = 0;
	let progressReads = 0;
	let completed = false;
	const initial = detail('batch');
	initial.batch.state = 'running';
	initial.counts = { pending: 2 };
	const final = { ...initial, batch: { ...initial.batch, state: 'completed' as const }, counts: { created: 2 } };
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => {
			fullReads++;
			return completed ? final : initial;
		},
		status: async () => {
			progressReads++;
			return { batch: completed ? final.batch : initial.batch, counts: completed ? final.counts : { pending: 1, created: 1 }, version: progressReads, updatedAt: '2026-10-26T00:00:00Z' };
		},
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = createState();
	try {
		await state.connect('batch', 'school:user');
		const snapshot = state.detail?.rows;
		await state.refresh(true);
		expect(fullReads).toBe(1);
		expect(state.detail?.rows).toBe(snapshot);
		expect(state.detail?.counts).toEqual({ pending: 1, created: 1 });
		completed = true;
		await state.refresh(true);
		expect(fullReads).toBe(2);
		expect(progressReads).toBe(2);
		expect(state.detail).toEqual(final);
	}
	finally {
		state.disconnect();
		spy.mockRestore();
	}
});

test('a progress response from the previous school cannot replace the current import', async () => {
	let finish!: (value: components['schemas']['SchoolImportStatus']) => void;
	const running = detail('old');
	running.batch.state = 'running';
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async ({ batchId }: { batchId: string }) => batchId === 'old' ? running : detail(batchId),
		status: async () => new Promise<components['schemas']['SchoolImportStatus']>((resolve) => { finish = resolve; }),
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = createState();
	try {
		await state.connect('old', 'first-school:user');
		const pending = state.refresh(true);
		await state.connect('new', 'second-school:user');
		finish({ batch: running.batch, counts: { created: 10 }, version: 1, updatedAt: null });
		expect(await pending).toBe(false);
		expect(state.detail?.batch.id).toBe('new');
		expect(state.detail?.counts).toEqual({});
	}
	finally {
		state.disconnect();
		spy.mockRestore();
	}
});

test('permission loss during progress polling clears private rows and stops polling', async () => {
	const running = detail('batch');
	running.batch.state = 'running';
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => running,
		status: async () => { throw new ApiError(403, {}); },
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = createState();
	try {
		await state.connect('batch', 'school:user');
		expect(await state.refresh(true)).toBe(false);
		expect(state.readStatus).toBe('denied');
		expect(state.detail).toBeNull();
	}
	finally {
		state.disconnect();
		spy.mockRestore();
	}
});

test('failed final detail retains committed progress and can retry without a write', async () => {
	const running = detail('batch');
	running.batch.state = 'running';
	let fail = false;
	const completed = { ...running, batch: { ...running.batch, state: 'completed' as const }, counts: { created: 2 } };
	const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: {
		history: async () => ({ batches: [] }),
		detail: async () => {
			if (fail)
				throw new ApiError(503, {});
			return running;
		},
		status: async () => ({ batch: completed.batch, counts: completed.counts, version: 2, updatedAt: null }),
	} } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
	const state = createState();
	try {
		await state.connect('batch', 'school:user');
		fail = true;
		expect(await state.refresh(true)).toBe(false);
		expect(state.detail?.batch.state).toBe('completed');
		expect(state.detail?.counts).toEqual({ created: 2 });
		expect(state.readStatus).toBe('error');
	}
	finally {
		state.disconnect();
		spy.mockRestore();
	}
});
