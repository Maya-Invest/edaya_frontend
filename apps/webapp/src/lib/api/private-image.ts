import { PUBLIC_API_URL } from '$env/static/public';
import { bearerFetch } from '$lib/auth/bearer-fetch';

/** Private images are fetched with a header; credentials never enter image URLs. */
export async function loadPrivateImage(source: string, signal: AbortSignal): Promise<{ url: string; dispose: () => void }> {
	const api = new URL(PUBLIC_API_URL);
	const url = new URL(source, api.origin);
	if (url.origin !== api.origin || !url.pathname.startsWith('/core/files/')) {
		return { url: source, dispose: () => {} };
	}
	const response = await bearerFetch(url.href, { signal });
	if (!response.ok) {
		throw new Error('Image is unavailable');
	}
	const objectUrl = URL.createObjectURL(await response.blob());
	return { url: objectUrl, dispose: () => URL.revokeObjectURL(objectUrl) };
}
