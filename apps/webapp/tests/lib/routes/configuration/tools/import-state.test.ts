import type { DataImportState } from '../../../../../src/routes/(app)/configuration/tools/import-state.svelte';
import type { components } from '$lib/api/schema';
import * as schoolClient from '$lib/api/school-client';
import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileModule } from 'svelte/compiler';

type Detail = components['schemas']['SchoolImportDetail'];
const sourcePath = resolve('src/routes/(app)/configuration/tools/import-state.svelte.ts');
const compiledPath = resolve(`.svelte-kit/import-state-test-${process.pid}.mjs`);
let State: typeof DataImportState;
beforeAll(async () => {
  // Replace browser-only toast feedback while exercising asynchronous request guards.
  const source = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(sourcePath).text()).replace(/^import.*runMutation.*$/m, 'const runMutation = async (request, options) => { const result = await request(); await options?.onSuccess?.(result); return result; };');
  await Bun.write(compiledPath, compileModule(source, { filename: sourcePath, generate: 'server' }).js.code);
  State = (await import(compiledPath)).DataImportState;
});
afterAll(async () => { await unlink(compiledPath); });
const detail = (id: string): Detail => ({ batch: { id, schoolId: 'school', academicYearId: 'year', createdByStaffId: 'staff', createdBySubjectId: 'subject', defaultOnExisting: 'M', enrollmentEffectiveDate: null, revision: 1, state: 'draft', previewDigest: null, workId: null, approval: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' }, files: [], rows: [], counts: {} });

test('route-owned history restores the selected batch and ignores a stale response after navigation', async () => {
  let finish!: (value: Detail) => void;
  const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: { history: async () => ({ batches: [] }), detail: async ({ batchId }: { batchId: string }) => batchId === 'old' ? new Promise<Detail>(resolve => { finish = resolve; }) : detail(batchId) } } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
  try {
    const state = new State();
    const old = state.connect('old', 'school:user');
    await Promise.resolve();
    await state.connect('new', 'school:user');
    finish(detail('old'));
    await old;
    expect(state.detail?.batch.id).toBe('new');
    state.disconnect();
  } finally { spy.mockRestore(); }
});
test('switching user clears previous private batch data even when loading the same ID fails', async () => {
  let denied = false;
  const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: { history: async () => ({ batches: [] }), detail: async () => { if (denied) throw new Error('denied'); return detail('batch'); } } } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
  try {
    const state = new State();
    await state.connect('batch', 'school:first-user');
    denied = true;
    await state.connect('batch', 'school:second-user');
    expect(state.detail).toBeNull();
    expect(state.error).not.toBe('');
    state.disconnect();
  } finally { spy.mockRestore(); }
});


test('a completed creation from the previous user cannot navigate the next user to its batch', async () => {
  let finish!: (value: Detail['batch']) => void;
  const spy = spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ imports: { history: async () => ({ batches: [] }), create: async () => new Promise<Detail['batch']>(resolve => { finish = resolve; }) } } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
  try {
    const state = new State();
    await state.connect(null, 'school:first-user');
    const creating = state.create('year', 'M', '');
    await state.connect(null, 'school:second-user');
    finish(detail('private-batch').batch);
    expect(await creating).toBeNull();
    expect(state.detail).toBeNull();
    expect(state.busy).toBe(false);
    state.disconnect();
  } finally { spy.mockRestore(); }
});
