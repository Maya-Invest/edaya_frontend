import { expect, test } from 'bun:test';
import { DirectoryCache } from '../../src/lib/api/directory-cache';

const page = (name: string) => Response.json({ name }, { headers: { ETag: '"' + name + '"', 'Cache-Control': 'private, no-cache' } });
const unchanged = () => new Response(null, { status: 304 });

test('a retained page requires fresh authorization on each visit and denial clears it', async () => {
	const cache = new DirectoryCache();
	const first = await cache.read<{ name: string }>('profile', '/page', async etag => {
		expect(etag).toBeUndefined();
		return page('initial');
	});
	first.name = 'changed locally';
	expect(await cache.read<{ name: string }>('profile', '/page', async etag => {
		expect(etag).toBe('"initial"');
		return unchanged();
	})).toEqual({ name: 'initial' });
	await expect(cache.read('profile', '/page', async () => new Response('denied', { status: 403 }))).rejects.toMatchObject({ status: 403 });
	await cache.read('profile', '/page', async etag => {
		expect(etag).toBeUndefined();
		return page('new');
	});
});

test('conditional response after eviction retries once without its validator', async () => {
	const cache = new DirectoryCache();
	await cache.read('scope', 'first', async () => page('old'));
	const pending = Promise.withResolvers<Response>();
	const tags: (string | undefined)[] = [];
	const result = cache.read('scope', 'first', async etag => {
		tags.push(etag);
		return etag ? pending.promise : page('reloaded');
	});
	for (let i = 0; i < 32; i++)
		await cache.read('scope', String(i), async () => page(String(i)));
	pending.resolve(unchanged());
	expect(await result).toEqual({ name: 'reloaded' });
	expect(tags).toEqual(['"old"', undefined]);
});

test('late responses from a previous profile cannot restore a page', async () => {
	const cache = new DirectoryCache();
	const pending = Promise.withResolvers<Response>();
	const first = cache.read('first profile', '/page', () => pending.promise);
	await cache.read('second profile', '/page', async etag => {
		expect(etag).toBeUndefined();
		return page('second');
	});
	pending.resolve(page('first'));
	await expect(first).rejects.toMatchObject({ name: 'AbortError' });
	expect(await cache.read<{ name: string }>('second profile', '/page', async () => unchanged())).toEqual({ name: 'second' });
});
