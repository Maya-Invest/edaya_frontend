import { afterAll, beforeAll, describe, expect, it, mock, spyOn } from 'bun:test';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileModule } from 'svelte/compiler';
import * as schoolClient from '$lib/api/school-client';
import type { CorrectionsPageState, CorrectionItem } from '../../../../../src/routes/(app)/school/corrections/corrections-page.svelte';

// Compile the actual rune module to its server form so these tests exercise
// its request ordering without replacing $state globally or copying its logic.
const sourcePath = resolve('src/routes/(app)/school/corrections/corrections-page.svelte.ts');
const compiledPath = resolve(`.svelte-kit/corrections-state-test-${process.pid}.mjs`);
let State: typeof CorrectionsPageState;
let academicContext: { scopeGeneration: number };
beforeAll(async () => {
 academicContext = (await import('$lib/academic/context.svelte')).academicContext;
 const source = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(sourcePath).text());
 await Bun.write(compiledPath, compileModule(source, { filename: sourcePath, generate: 'server' }).js.code);
 State = (await import(compiledPath)).CorrectionsPageState;
});
afterAll(async () => { await unlink(compiledPath); });
const url = (search = '') => new URL(`http://localhost/school/corrections${search}`);
const items = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({ id: `correction-${start + index}` } as CorrectionItem));
const response = (start: number, count: number, total = 53) => ({ items: items(start, count), total, filters: { classes: [], teachers: [], students: [] } });
function clientFor(list: (...args: any[]) => Promise<any>) {
 return spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ queries: { listTeacherCorrections: list, getTeacherCorrection: async () => null } } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
}

describe('correction infinite loading', () => {
 it('appends all batches and retains them across drawer navigation', async () => {
  const list = mock(async ({ offset }: { offset: number }) => response(offset, Math.min(25, 53 - offset)));
  const spy = clientFor(list);
  try {
   const state = new State();
   await state.query(url());
   await state.loadMore();
   expect(state.items).toHaveLength(50);
   await state.query(url('?correction=correction-40'));
   await state.query(url());
   expect(list).toHaveBeenCalledTimes(2);
   expect(state.items).toHaveLength(50);
   await state.loadMore();
   expect(state.items).toHaveLength(53);
   expect(state.hasMore).toBe(false);
   expect(list.mock.calls.map(([input]) => input.offset)).toEqual([0, 25, 50]);
  } finally { spy.mockRestore(); }
 });

 it('ignores an older batch after filters change', async () => {
  let finishOld!: (value: ReturnType<typeof response>) => void;
  const list = mock(async ({ offset, workflow }: { offset: number; workflow?: string }) => {
   if (offset > 0) return await new Promise<ReturnType<typeof response>>(resolve => { finishOld = resolve; });
   return workflow ? response(100, 3, 3) : response(0, 25);
  });
  const spy = clientFor(list);
  try {
   const state = new State();
   await state.query(url());
   const pending = state.loadMore();
   await state.query(url('?workflow=attendance'));
   finishOld(response(25, 25));
   await pending;
   expect(state.items.map(item => item.id)).toEqual(items(100, 3).map(item => item.id));
   expect(state.loadingMore).toBe(false);
   expect(state.hasMore).toBe(false);
  } finally { spy.mockRestore(); }
 });

 it('blocks concurrent loads and consumes overlapping rows without duplicates', async () => {
  let finish!: (value: ReturnType<typeof response>) => void;
  const list = mock(async ({ offset }: { offset: number }) => offset === 0 ? response(0, 25) : await new Promise<ReturnType<typeof response>>(resolve => { finish = resolve; }));
  const spy = clientFor(list);
  try {
   const state = new State();
   await state.query(url());
   const pending = state.loadMore();
   await state.loadMore();
   expect(list).toHaveBeenCalledTimes(2);
   finish(response(24, 25));
   await pending;
   expect(state.items).toHaveLength(49);
   expect(new Set(state.items.map(item => item.id)).size).toBe(49);
  } finally { spy.mockRestore(); }
 });

 it('preserves rows on a failed batch and retries the same offset', async () => {
  const list = mock(async ({ offset }: { offset: number }) => response(offset, 25));
  const spy = clientFor(list);
  try {
   const state = new State();
   await state.query(url());
   list.mockRejectedValueOnce(new Error('offline'));
   await state.loadMore();
   expect(state.items).toHaveLength(25);
   expect(state.loadMoreError).toBe(true);
   expect(state.loadingMore).toBe(false);
   state.loadMoreError = false;
   await state.loadMore();
   expect(state.items).toHaveLength(50);
   expect(list.mock.calls.map(([input]) => input.offset)).toEqual([0, 25, 25]);
  } finally { spy.mockRestore(); }
 });

 it('discards a response when academic scope changes before refresh starts', async () => {
  let finish!: (value: ReturnType<typeof response>) => void;
  const list = mock(async ({ offset }: { offset: number }) => offset === 0 ? response(0, 25) : await new Promise<ReturnType<typeof response>>(resolve => { finish = resolve; }));
  const spy = clientFor(list);
  const scope = academicContext.scopeGeneration;
  try {
   const state = new State();
   await state.query(url());
   const pending = state.loadMore();
   academicContext.scopeGeneration += 1;
   finish(response(25, 25));
   await pending;
   expect(state.items).toHaveLength(25);
  } finally { academicContext.scopeGeneration = scope; spy.mockRestore(); }
 });
});
