import type { PageLoadMeta } from '$lib/page/load-state';
import { finalizeStatus, maybeSimulateLoading, resolveDemoState } from '$lib/page/load-state';

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
		load: () => Promise<T>;
		empty: () => T;
		hasItems: (data: T) => boolean;
		errorMessage?: string;
	},
): Promise<T & PageLoadMeta> {
	await ensureAppShellReady();
	await maybeSimulateLoading(url);
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
		const data = await options.load();
		return { ...data, ...finalizeStatus(url, options.hasItems(data)) };
	}
	catch {
		return {
			...options.empty(),
			status: 'error',
			errorMessage: options.errorMessage ?? 'Unable to load this page.',
		};
	}
}
