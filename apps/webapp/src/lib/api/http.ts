import { ApiError, unwrapEntity, unwrapEntityList } from '$api-client';

export { ApiError };

function isEntityCollectionPath(path: string): boolean {
	return /\/core\/entities\/[^/]+\/(?:list|one|save)$/.test(path);
}

function isEntityGetPath(path: string): boolean {
	return /\/core\/entities\/[^/]+\/[^/]+$/.test(path)
		&& !path.endsWith('/list')
		&& !path.endsWith('/one')
		&& !path.endsWith('/save')
		&& !path.endsWith('/count')
		&& !path.endsWith('/delete')
		&& !path.endsWith('/batch-save')
		&& !path.endsWith('/batch-delete');
}

export async function parseApiResponse<T>(path: string, response: Response): Promise<T> {
	if (!response.ok) {
		let body: unknown;
		try {
			body = await response.json();
		}
		catch {
			body = await response.text();
		}
		throw new ApiError(response.status, body);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	const json = await response.json();
	if (isEntityCollectionPath(path)) {
		return (Array.isArray(json) ? unwrapEntityList(json) : unwrapEntity(json)) as T;
	}
	if (isEntityGetPath(path)) {
		return unwrapEntity(json) as T;
	}
	return json as T;
}

export function resolveApiUrl(base: string, path: string): string {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	return `${base}${normalized}`;
}
