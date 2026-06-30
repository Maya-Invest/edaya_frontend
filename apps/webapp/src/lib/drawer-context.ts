import type { DrawerState } from '$lib/drawer.svelte';
import { getContext } from 'svelte';

export function getDrawer(): DrawerState {
	return getContext<DrawerState>('drawer');
}
