import type { ResolvedPathname } from '$app/types';

export const MODAL_QUERY_KEY = 'modal';
export const MODAL_TARGET_QUERY_KEY = 'modalTarget';

export function readModal<T extends string>(
	url: URL,
	allowed: readonly T[],
): T | null {
	const raw = url.searchParams.get(MODAL_QUERY_KEY);
	if (raw && (allowed as readonly string[]).includes(raw)) {
		return raw as T;
	}
	return null;
}

export function readModalTarget(url: URL): string | null {
	return url.searchParams.get(MODAL_TARGET_QUERY_KEY);
}

export function writeModal(
	url: URL,
	modal: string | null,
	target: string | null = null,
): string {
	const next = new URL(url);
	if (modal === null) {
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
	}
	else {
		next.searchParams.set(MODAL_QUERY_KEY, modal);
		if (target) {
			next.searchParams.set(MODAL_TARGET_QUERY_KEY, target);
		}
		else {
			next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		}
	}
	return `${next.pathname}${next.search}`;
}

export function appendModal(
	href: string,
	modal: string | undefined,
	target?: string,
): ResolvedPathname {
	if (!modal) {
		return href as ResolvedPathname;
	}
	const url = new URL(href, 'http://local');
	url.searchParams.set(MODAL_QUERY_KEY, modal);
	if (target) {
		url.searchParams.set(MODAL_TARGET_QUERY_KEY, target);
	}
	return `${url.pathname}${url.search}` as ResolvedPathname;
}
