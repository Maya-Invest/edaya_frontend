import { isAuthenticatedSchoolFileUrl } from '../documents/school-file-url';

/**
 * Resolve the authenticated grant before fetching storage bytes. Following a
 * cross-origin redirect makes the browser send an opaque Origin to storage.
 */
export async function fetchPrivateImageBlob(
	url: URL,
	signal: AbortSignal,
	authorizedFetch: (url: string, init?: RequestInit) => Promise<Response>,
	storageFetch: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<Blob> {
	const attachment = url.pathname.match(/^\/core\/files\/([^/]+)\/content$/);
	let response: Response;
	if (attachment) {
		const grantUrl = new URL(`/core/files/${attachment[1]}/download-url`, url.origin);
		const grant = await authorizedFetch(grantUrl.href, { signal });
		if (!grant.ok)
			throw new Error('Image grant is unavailable');
		const { downloadUrl } = await grant.json() as { downloadUrl: string };
		return fetchGrantedImageBlob(downloadUrl, url.origin, signal, authorizedFetch, storageFetch);
	}
	else {
		response = await authorizedFetch(url.href, { signal });
	}
	if (!response.ok)
		throw new Error('Image is unavailable');
	return response.blob();
}

export async function fetchGrantedImageBlob(downloadUrl: string, apiOrigin: string, signal: AbortSignal, authorizedFetch: (url: string, init?: RequestInit) => Promise<Response>, storageFetch: (url: string, init?: RequestInit) => Promise<Response> = fetch): Promise<Blob> {
	const destination = new URL(downloadUrl);
	if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password) {
		throw new Error('Invalid image download destination');
	}
	const response = isAuthenticatedSchoolFileUrl(destination.href, apiOrigin)
		? await authorizedFetch(destination.href, { signal, redirect: 'error' })
		: await storageFetch(destination.href, { signal, credentials: 'omit' });
	if (!response.ok)
		throw new Error('Image is unavailable');
	return response.blob();
}
