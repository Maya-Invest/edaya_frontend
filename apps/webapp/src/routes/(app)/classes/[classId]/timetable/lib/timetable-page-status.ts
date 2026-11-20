import type { PageLoadMeta } from '$lib/page/load-state';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { resolvePageLoad } from '$lib/queries/page-status';

export type { PageQueryRequest } from '$lib/queries/page-status';

export function listPageHasItems(): boolean {
	return true;
}

export function resolveTimetablePageLoad<T>(
	url: URL,
	options: {
		load: (signal: AbortSignal) => Promise<T>;
		empty: () => T;
		hasItems: (data: T) => boolean;
		errorMessage?: string;
	},
	request?: PageQueryRequest,
): Promise<T & PageLoadMeta> {
	return resolvePageLoad(url, { ...options, waitForShell: false }, request);
}
