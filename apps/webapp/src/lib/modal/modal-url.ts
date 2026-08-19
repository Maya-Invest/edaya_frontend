import type { ResolvedPathname } from '$app/types';

export const MODAL_QUERY_KEY = 'modal';
export const MODAL_TARGET_QUERY_KEY = 'modalTarget';
export const MODAL_STEP_QUERY_KEY = 'modalStep';
export const MODAL_TAB_QUERY_KEY = 'modalTab';

export interface ModalSurfaceValue {
	modal: string | null;
	target?: string | null;
	step?: string | null;
	tab?: string | null;
}

function readAllowed<T extends string>(
	url: URL,
	key: string,
	allowed: readonly T[],
): T | null {
	const raw = url.searchParams.get(key);
	if (raw && (allowed as readonly string[]).includes(raw)) {
		return raw as T;
	}
	return null;
}

export function readModal<T extends string>(
	url: URL,
	allowed: readonly T[],
): T | null {
	return readAllowed(url, MODAL_QUERY_KEY, allowed);
}

export function readModalTarget(url: URL): string | null {
	return url.searchParams.get(MODAL_TARGET_QUERY_KEY);
}

export function readModalStep<T extends string>(
	url: URL,
	allowed: readonly T[],
): T | null {
	return readAllowed(url, MODAL_STEP_QUERY_KEY, allowed);
}

export function readModalTab<T extends string>(
	url: URL,
	allowed: readonly T[],
): T | null {
	return readAllowed(url, MODAL_TAB_QUERY_KEY, allowed);
}

export function writeModalSurface(url: URL, value: ModalSurfaceValue): string {
	const next = new URL(url);
	if (value.modal === null) {
		next.searchParams.delete(MODAL_QUERY_KEY);
		next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
		next.searchParams.delete(MODAL_STEP_QUERY_KEY);
		next.searchParams.delete(MODAL_TAB_QUERY_KEY);
		return `${next.pathname}${next.search}`;
	}

	next.searchParams.set(MODAL_QUERY_KEY, value.modal);
	const values = [
		[MODAL_TARGET_QUERY_KEY, value.target],
		[MODAL_STEP_QUERY_KEY, value.step],
		[MODAL_TAB_QUERY_KEY, value.tab],
	] as const;
	for (const [key, candidate] of values) {
		if (candidate) {
			next.searchParams.set(key, candidate);
		}
		else {
			next.searchParams.delete(key);
		}
	}
	return `${next.pathname}${next.search}`;
}

export function writeModal(
	url: URL,
	modal: string | null,
	target: string | null = null,
): string {
	return writeModalSurface(url, { modal, target });
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
