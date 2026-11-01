import type { PageLoadMeta } from '$lib/page/load-state';
import type { PageQueryRequest } from '$lib/queries/page-query-runtime';
import { finalizeStatus, maybeSimulateLoading, resolveDemoState } from '$lib/page/load-state';
import {
	isPageQueryAbortError,
	resolvePageQuerySignal,
} from '$lib/queries/page-query-runtime';
import { ApiError } from '@maya-invest/edaya-api-client';

export type { PageQueryRequest } from '$lib/queries/page-query-runtime';

async function ensureAppShellReady() {
	if (typeof window === 'undefined') {
		return;
	}
	const { bootstrapAppShell } = await import('$lib/auth/bootstrap-app');
	await bootstrapAppShell();
}

/** List routes with in-view empty state + header CTA — never use full-page DataState empty. */
export function listPageHasItems(): boolean {
	return true;
}

export async function resolvePageLoad<T>(
	url: URL,
	options: {
		load: (signal: AbortSignal) => Promise<T>;
		empty: () => T;
		hasItems: (data: T) => boolean;
		errorMessage?: string;
		waitForShell?: boolean;
	},
	request?: PageQueryRequest,
): Promise<T & PageLoadMeta> {
	const signal = resolvePageQuerySignal(request);
	if (options.waitForShell !== false) {
		await ensureAppShellReady();
		signal.throwIfAborted();
	}
	await maybeSimulateLoading(url);
	signal.throwIfAborted();
	const demo = resolveDemoState(url);
	if (demo === 'error') {
		return {
			...options.empty(),
			status: 'error',
			errorMessage: options.errorMessage ?? 'Unable to load this page.',
		};
	}
	if (demo === 'empty') {
		return { ...options.empty(), status: 'empty' };
	}
	try {
		const data = await options.load(signal);
		signal.throwIfAborted();
		return { ...data, ...finalizeStatus(url, options.hasItems(data)) };
	}
	catch (error) {
		if (isPageQueryAbortError(error)) {
			throw error;
		}
		return {
			...options.empty(),
			status: error instanceof ApiError && (error.status === 401 || error.status === 403) ? 'denied' : 'error',
			errorMessage: options.errorMessage ?? 'Unable to load this page.',
		};
	}
}
