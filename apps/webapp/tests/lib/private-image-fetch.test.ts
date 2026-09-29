import { expect, test } from 'bun:test';
import { fetchPrivateImageBlob } from '../../src/lib/api/private-image-fetch';

test('private image obtains a grant and fetches storage without account credentials', async () => {
	const calls: Array<{ url: string; init?: RequestInit }> = [];
	const authorize: Parameters<typeof fetchPrivateImageBlob>[2] = async (url, init) => {
		calls.push({ url: String(url), init });
		return Response.json({ downloadUrl: 'https://storage.example/download?token=signed' });
	};
	const storage: Parameters<typeof fetchPrivateImageBlob>[3] = async (url, init) => {
		calls.push({ url: String(url), init });
		return new Response('image bytes', { headers: { 'Content-Type': 'image/png' } });
	};
	const blob = await fetchPrivateImageBlob(new URL('https://api.example/core/files/portrait/content?v=1'), new AbortController().signal, authorize, storage);
	expect(await blob.text()).toBe('image bytes');
	expect(calls.map(call => call.url)).toEqual(['https://api.example/core/files/portrait/download-url', 'https://storage.example/download?token=signed']);
	expect(calls[1]!.init?.credentials).toBe('omit');
	expect(calls[1]!.init?.headers).toBeUndefined();
});

test('denied image grants never contact storage', async () => {
	let storageCalled = false;
	await expect(fetchPrivateImageBlob(new URL('https://api.example/core/files/portrait/content'), new AbortController().signal,
		async () => new Response('', { status: 403 }),
		async () => { storageCalled = true; return new Response(); },
	)).rejects.toThrow('grant');
	expect(storageCalled).toBe(false);
});
