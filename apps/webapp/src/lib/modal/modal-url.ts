import type { ResolvedPathname } from '$app/types';

export const MODAL_QUERY_KEY = 'modal';
export const MODAL_TARGET_QUERY_KEY = 'modalTarget';
export const MODAL_STEP_QUERY_KEY = 'modalStep';
export const MODAL_TAB_QUERY_KEY = 'modalTab';

export interface SurfaceQueryKeys { kind: string; target: string; step: string; panel: string }
export const MODAL_QUERY_KEYS: SurfaceQueryKeys = { kind: MODAL_QUERY_KEY, target: MODAL_TARGET_QUERY_KEY, step: MODAL_STEP_QUERY_KEY, panel: MODAL_TAB_QUERY_KEY };
export const TASK_QUERY_KEYS: SurfaceQueryKeys = { kind: 'task', target: 'taskTarget', step: 'taskStep', panel: 'taskPanel' };
export type TaskKind = 'import' | 'generate-timetable' | 'grade-entry' | 'attendance-roll-call';

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
	keys: SurfaceQueryKeys = MODAL_QUERY_KEYS,
): T | null {
	return readAllowed(url, keys.kind, allowed);
}

export function readModalTarget(url: URL, keys: SurfaceQueryKeys = MODAL_QUERY_KEYS): string | null {
	return url.searchParams.get(keys.target);
}

export function readModalStep<T extends string>(
	url: URL,
	allowed: readonly T[],
	keys: SurfaceQueryKeys = MODAL_QUERY_KEYS,
): T | null {
	return readAllowed(url, keys.step, allowed);
}

export function readModalTab<T extends string>(
	url: URL,
	allowed: readonly T[],
	keys: SurfaceQueryKeys = MODAL_QUERY_KEYS,
): T | null {
	return readAllowed(url, keys.panel, allowed);
}

export function writeModalSurface(url: URL, value: ModalSurfaceValue, keys: SurfaceQueryKeys = MODAL_QUERY_KEYS): string {
	const next = new URL(url);
	if (value.modal === null) {
		next.searchParams.delete(keys.kind);
		next.searchParams.delete(keys.target);
		next.searchParams.delete(keys.step);
		next.searchParams.delete(keys.panel);
		return `${next.pathname}${next.search}`;
	}

	next.searchParams.set(keys.kind, value.modal);
	const values = [
		[keys.target, value.target],
		[keys.step, value.step],
		[keys.panel, value.tab],
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
