import { PUBLIC_API_URL } from '$env/static/public';
import { academicContext } from '$lib/academic/context.svelte';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { schoolRequestHeaders } from './browser-transport';
import { fetchPrivateImageBlob } from './private-image-fetch';

/** Private images are fetched with a header; credentials never enter image URLs. */
export async function loadPrivateImage(source: string, signal: AbortSignal): Promise<{ url: string; dispose: () => void }> {
	const api = new URL(PUBLIC_API_URL);
	const url = new URL(source, api.origin);
	if (url.origin !== api.origin || !url.pathname.startsWith('/core/files/')) {
		return { url: source, dispose: () => {} };
	}
	const headers = schoolRequestHeaders(academicContext.yearId);
	const blob = await fetchPrivateImageBlob(url, signal, (input, init) => bearerFetch(input, { ...init, headers, redirect: 'error' }));
	const objectUrl = URL.createObjectURL(blob);
	return { url: objectUrl, dispose: () => URL.revokeObjectURL(objectUrl) };
}
