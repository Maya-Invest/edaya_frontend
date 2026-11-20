import type { DirtyWork } from '$lib/interaction/dirty-work.svelte';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

let Guard: typeof DirtyWork;
const sourcePath = resolve('src/lib/interaction/dirty-work.svelte.ts');
const compiledPath = resolve(`.svelte-kit/dirty-work-test-${process.pid}.mjs`);
beforeAll(async () => {
	const source = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(sourcePath).text());
	await Bun.write(compiledPath, compileModule(source, { filename: sourcePath, generate: 'server' }).js.code);
	Guard = (await import(compiledPath)).DirtyWork;
});
afterAll(async () => { await unlink(compiledPath); });

test('navigation inside a retained draft proceeds without discarding it; leaving still guards', () => {
	const guard = new Guard();
	let dirty = true;
	let proceeded = 0;
	guard.register({ isDirty: () => dirty, discard: () => { dirty = false; }, retainsDraft: url => url.pathname === '/same-task' });
	guard.request(() => proceeded++, new URL('https://local/same-task'));
	expect(proceeded).toBe(1);
	expect(dirty).toBe(true);
	expect(guard.pending).toBeNull();
	guard.request(() => proceeded++, new URL('https://local/elsewhere'));
	expect(proceeded).toBe(1);
	guard.cancel();
	expect(dirty).toBe(true);
	guard.request(() => proceeded++, new URL('https://local/elsewhere'));
	guard.discard();
	expect(proceeded).toBe(2);
	expect(dirty).toBe(false);
});

test('confirmation discards only affected mounted drafts, never a retained or newly mounted owner', () => {
	const guard = new Guard();
	const discarded: string[] = [];
	guard.register({ isDirty: () => true, discard: () => discarded.push('retained'), retainsDraft: () => true });
	const unregister = guard.register({ isDirty: () => true, discard: () => discarded.push('unmounted') });
	guard.register({ isDirty: () => true, discard: () => discarded.push('affected') });
	guard.request(() => {}, new URL('https://local/next-step'));
	unregister();
	guard.register({ isDirty: () => true, discard: () => discarded.push('new') });
	guard.discard();
	expect(discarded).toEqual(['affected']);
});
