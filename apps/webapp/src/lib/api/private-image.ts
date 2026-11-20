import type { PortraitReference } from './student-portrait-cache';
import { PUBLIC_API_URL } from '$env/static/public';
import { academicContext } from '$lib/academic/context.svelte';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { authSession } from '$lib/auth/session.svelte';
import { schoolRequestHeaders } from './browser-transport';
import { fetchGrantedImageBlob, fetchPrivateImageBlob } from './private-image-fetch';
import { getBrowserSchoolClient } from './school-client';
import { studentPortraitCache } from './student-portrait-cache';

/** Private images are fetched with a header; credentials never enter image URLs. */
export async function loadPrivateImage(source: string, signal: AbortSignal, portrait?: PortraitReference): Promise<{ url: string; dispose: () => void }> {
	const api = new URL(PUBLIC_API_URL);
	const url = new URL(source, api.origin);
	if (url.origin !== api.origin || !url.pathname.startsWith('/core/files/')) {
		return { url: source, dispose: () => {} };
	}
	const headers = schoolRequestHeaders(academicContext.yearId);
	const authorized = (input: string, init?: RequestInit) => bearerFetch(input, { ...init, headers, redirect: 'error' });
	let blob: Blob;
	if (portrait) {
		const scope = () => JSON.stringify([api.origin, authSession.authUserId, authSession.subjectId, authSession.schoolId, authSession.userId, authSession.sessionKind, academicContext.yearId, academicContext.scopeGeneration, authSession.grants]);
		const identity = scope();
		const check = () => {
			if (scope() !== identity)
				throw new DOMException('Portrait scope changed', 'AbortError');
		};
		blob = await studentPortraitCache.read(identity, portrait, signal, async (photos, batchSignal) => {
			check();
			const result = await getBrowserSchoolClient().queries.getStudentPortraitGrants({ photos }, { signal: batchSignal });
			check();
			return result;
		}, async (grant, byteSignal) => {
			check();
			const result = await fetchGrantedImageBlob(grant.downloadUrl, api.origin, byteSignal, authorized);
			check();
			return result;
		});
		check();
	}
	else {
		blob = await fetchPrivateImageBlob(url, signal, authorized);
	}
	signal.throwIfAborted();
	const objectUrl = URL.createObjectURL(blob);
	return { url: objectUrl, dispose: () => URL.revokeObjectURL(objectUrl) };
}
