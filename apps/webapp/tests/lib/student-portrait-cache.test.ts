import { expect, test } from 'bun:test';
import { StudentPortraitCache } from '../../src/lib/api/student-portrait-cache';

const ref = (id: string) => ({ studentId: 'student-' + id, attachmentId: id });
const signal = () => new AbortController().signal;
const tick = () => new Promise<void>(resolve => setTimeout(resolve, 1));

test('viewport batches are bounded, deduplicate references and reauthorize cached bytes', async () => {
	const cache = new StudentPortraitCache(100);
	const counts: number[] = [];
	let allowed = true;
	let checksum = 'hash1';
	let downloads = 0;
	const grants = async (refs: ReturnType<typeof ref>[]) => {
		counts.push(refs.length);
		return { grants: allowed ? refs.map(r => ({ ...r, checksum, downloadUrl: 'unused' })) : [] };
	};
	const load = (id: string) => cache.read('scope', ref(id), signal(), grants, async () => new Blob([String(++downloads)]));
	const ids = Array.from({ length: 30 }, (_, i) => String(i));
	await Promise.all([...ids, '0'].map(load));
	expect(counts).toEqual([25, 5]);
	expect(downloads).toBe(30);
	await load('0');
	expect(counts).toEqual([25, 5, 1]);
	expect(downloads).toBe(30);
	checksum = 'hash2';
	await load('0');
	expect(downloads).toBe(31);
	allowed = false;
	await expect(load('0')).rejects.toThrow('unavailable');
	expect(downloads).toBe(31);
	allowed = true;
	await load('0');
	expect(downloads).toBe(32);
});

test('one canceled consumer leaves its sibling intact and a scope change discards late bytes', async () => {
	const cache = new StudentPortraitCache();
	const refs = [ref('a')];
	const grants = async () => ({ grants: refs.map(r => ({ ...r, checksum: 'hash', downloadUrl: 'unused' })) });
	const cancel = new AbortController();
	let release!: (blob: Blob) => void;
	const readBytes = () => new Promise<Blob>(resolve => { release = resolve; });
	const one = cache.read('old', refs[0]!, cancel.signal, grants, readBytes);
	const two = cache.read('old', refs[0]!, signal(), grants, readBytes);
	cancel.abort();
	await expect(one).rejects.toThrow();
	await tick();
	expect(release).toBeDefined();
	const newRead = cache.read('new', refs[0]!, signal(), grants, async () => new Blob(['new']));
	await expect(two).rejects.toThrow();
	release(new Blob(['old']));
	expect(await (await newRead).text()).toBe('new');
	const cached = await cache.read('new', refs[0]!, signal(), grants, async () => { throw Error('unexpected download'); });
	expect(await cached.text()).toBe('new');
});

test('evicts least recently used bytes and never retains unversioned downloads', async () => {
	const cache = new StudentPortraitCache(4);
	let downloads = 0;
	const read = (id: string) => cache.read('scope', ref(id), signal(),
		async refs => ({ grants: refs.map(r => ({ ...r, checksum: id === 'legacy' ? null : 'hash', downloadUrl: 'unused' })) }),
		async () => { downloads++; return new Blob(['abc']); });
	for (const id of ['a', 'a', 'b', 'a', 'legacy', 'legacy']) await read(id);
	expect(downloads).toBe(5);
});
