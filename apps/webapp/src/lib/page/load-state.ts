/** État de chargement d'une page (après résolution PageQuery — pas de `loading` ici). */
export type PageLoadState = 'ready' | 'empty' | 'error';

/** ?demo= — preview dev ; `loading` simule le délai via PageQuery, pas DataState. */
export type DemoPreviewState = PageLoadState | 'loading';

export interface PageLoadMeta {
	status: PageLoadState;
	errorMessage?: string;
}

/** ?demo=loading|empty|error — preview des états UI en dev. */
export function resolveDemoState(url: URL): DemoPreviewState {
	const demo = url.searchParams.get('demo');
	if (demo === 'loading' || demo === 'empty' || demo === 'error') {
		return demo;
	}
	return 'ready';
}

export async function maybeSimulateLoading(url: URL, ms = 600): Promise<void> {
	if (url.searchParams.get('demo') === 'loading') {
		await new Promise(resolve => setTimeout(resolve, ms));
	}
}

export function finalizeStatus(
	url: URL,
	hasItems: boolean,
	errorMessage = 'Unable to load this page.',
): PageLoadMeta {
	let status = resolveDemoState(url);
	if (status === 'loading') {
		status = 'ready';
	}
	if (status === 'error') {
		return { status: 'error', errorMessage };
	}
	if (status === 'empty' || !hasItems) {
		return { status: 'empty' };
	}
	return { status: 'ready' };
}
