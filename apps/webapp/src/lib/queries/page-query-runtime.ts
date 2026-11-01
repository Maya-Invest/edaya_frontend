import type { PageLoadMeta } from '$lib/page/load-state';

export interface PageQueryRequest {
	signal: AbortSignal;
}

export type PageQueryFn<T extends PageLoadMeta> = (
	url: URL,
	request: PageQueryRequest,
) => Promise<T>;

export const ACADEMIC_SCOPE_CACHE_SEPARATOR = '::scope=';

const neverAborted = new AbortController().signal;

export function stripAcademicScope(key: string): string {
	const index = key.indexOf(ACADEMIC_SCOPE_CACHE_SEPARATOR);
	return index === -1 ? key : key.slice(0, index);
}

export function withAcademicScopeSegment(base: string, scope: string): string {
	return scope ? `${base}${ACADEMIC_SCOPE_CACHE_SEPARATOR}${scope}` : base;
}

export function resolvePageQuerySignal(request?: PageQueryRequest): AbortSignal {
	return request?.signal ?? neverAborted;
}

export function isPageQueryAbortError(error: unknown): boolean {
	return (
		(error instanceof DOMException && error.name === 'AbortError')
		|| (error instanceof Error && error.name === 'AbortError')
	);
}

export function isCacheablePageQueryResult(data: object): boolean {
	if ('status' in data && data.status !== 'ready' && data.status !== 'empty')
		return false;
	return Object.keys(data).some(key => key !== 'status' && key !== 'errorMessage');
}

export function composePageQueryIdentity(cacheKey: string, scopeGeneration: number): string {
	return `${cacheKey}@g${scopeGeneration}`;
}

/**
 * Adapts a route query so PageQuery can pass AbortSignal without repeating
 * `(url, request) => query(url, request)` at every call site.
 */
export function bindPageQuery<T extends PageLoadMeta>(
	query: PageQueryFn<T> | ((url: URL, request?: PageQueryRequest) => Promise<T>),
): PageQueryFn<T> {
	return (url, request) => query(url, request);
}
