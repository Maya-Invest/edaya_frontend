import { getContext, setContext } from 'svelte';
import type { UrlSyncedModalsState } from '$lib/modal/modal-state.svelte';

const DRAWER_URL_MODALS_KEY = Symbol('drawer-url-modals');

export function setDrawerUrlModals<T extends string>(modals: UrlSyncedModalsState<T>) {
	setContext(DRAWER_URL_MODALS_KEY, modals);
}

export function getDrawerUrlModals<T extends string>(): UrlSyncedModalsState<T> | undefined {
	return getContext<UrlSyncedModalsState<T>>(DRAWER_URL_MODALS_KEY);
}
