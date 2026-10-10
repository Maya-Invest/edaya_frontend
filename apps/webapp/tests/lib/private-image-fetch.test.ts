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


test('local private photo bytes retain bearer authentication after the grant', async () => {
	const calls: Array<{ url: string; init?: RequestInit }> = [];
	const signal = new AbortController().signal;
	const authorize: Parameters<typeof fetchPrivateImageBlob>[2] = async (url, init) => {
		calls.push({ url, init });
		if (url.endsWith('/download-url')) {
			return Response.json({ downloadUrl: 'http://localhost:9999/core/files/memory/student%2Fportrait.jpg?fileName=profile.jpg' });
		}
		return new Response('private portrait', { headers: { 'Content-Type': 'image/jpeg' } });
	};
	let storageCalled = false;
	const blob = await fetchPrivateImageBlob(new URL('http://localhost:9999/core/files/pending/content'), signal, authorize, async () => {
		storageCalled = true;
		return new Response('', { status: 401 });
	});
	expect(await blob.text()).toBe('private portrait');
	expect(calls.map(call => call.url)).toEqual([
		'http://localhost:9999/core/files/pending/download-url',
		'http://localhost:9999/core/files/memory/student%2Fportrait.jpg?fileName=profile.jpg',
	]);
	expect(calls[1]!.init?.signal).toBe(signal);
	expect(calls[1]!.init?.redirect).toBe('error');
	expect(storageCalled).toBe(false);
});

test('storage on a different local port does not receive API credentials', async () => {
	let authorizedCalls = 0;
	const blob = await fetchPrivateImageBlob(new URL('http://localhost:9999/core/files/portrait/content'), new AbortController().signal,
		async () => {
			authorizedCalls++;
			return Response.json({ downloadUrl: 'http://localhost:9200/download?token=signed' });
		},
		async (url, init) => {
			expect(url).toBe('http://localhost:9200/download?token=signed');
			expect(init?.credentials).toBe('omit');
			expect(init?.headers).toBeUndefined();
			return new Response('image');
		},
	);
	expect(await blob.text()).toBe('image');
	expect(authorizedCalls).toBe(1);
});

test('denied local photo bytes are not retried without authentication', async () => {
	let storageCalled = false;
	await expect(fetchPrivateImageBlob(new URL('http://localhost:9999/core/files/portrait/content'), new AbortController().signal,
		async url => url.endsWith('/download-url')
			? Response.json({ downloadUrl: 'http://localhost:9999/core/files/memory/portrait' })
			: new Response('', { status: 403 }),
		async () => { storageCalled = true; return new Response('private'); },
	)).rejects.toThrow('Image is unavailable');
	expect(storageCalled).toBe(false);
});
