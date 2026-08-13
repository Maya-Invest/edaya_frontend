import {
	MODAL_QUERY_KEY,
	MODAL_STEP_QUERY_KEY,
	MODAL_TAB_QUERY_KEY,
	MODAL_TARGET_QUERY_KEY,
} from '$lib/modal/modal-url';

/** List filter search to keep when opening a URL-backed detail drawer. */
export function detailNavigationSearch(url: URL): string {
	const next = new URL(url);
	next.searchParams.delete(MODAL_QUERY_KEY);
	next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
	next.searchParams.delete(MODAL_STEP_QUERY_KEY);
	next.searchParams.delete(MODAL_TAB_QUERY_KEY);
	next.searchParams.delete('tab');
	return next.search;
}
