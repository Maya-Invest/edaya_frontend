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
		const destination = new URL(downloadUrl);
		if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password) {
			throw new Error('Invalid image download destination');
		}
		response = await storageFetch(destination.href, { signal, credentials: 'omit' });
	}
	else {
		response = await authorizedFetch(url.href, { signal });
	}
	if (!response.ok)
		throw new Error('Image is unavailable');
	return response.blob();
}
