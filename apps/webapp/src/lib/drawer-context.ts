import type { DrawerState } from '$lib/drawer.svelte';
import { getContext, setContext } from 'svelte';

export const DRAWER_CONTEXT_KEY = Symbol('drawer');

export function setDrawer(state: DrawerState) {
	setContext(DRAWER_CONTEXT_KEY, state);
}

export function getDrawer(): DrawerState {
	return getContext<DrawerState>(DRAWER_CONTEXT_KEY);
}
