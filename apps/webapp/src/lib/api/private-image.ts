import { PUBLIC_API_URL } from '$env/static/public';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { fetchPrivateImageBlob } from './private-image-fetch';

/** Private images are fetched with a header; credentials never enter image URLs. */
export async function loadPrivateImage(source: string, signal: AbortSignal): Promise<{ url: string; dispose: () => void }> {
	const api = new URL(PUBLIC_API_URL);
	const url = new URL(source, api.origin);
	if (url.origin !== api.origin || !url.pathname.startsWith('/core/files/')) {
		return { url: source, dispose: () => {} };
	}
	const blob = await fetchPrivateImageBlob(url, signal, (input, init) => bearerFetch(String(input), init));
	const objectUrl = URL.createObjectURL(blob);
	return { url: objectUrl, dispose: () => URL.revokeObjectURL(objectUrl) };
}
