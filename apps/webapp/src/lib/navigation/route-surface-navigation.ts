import { browser } from '$app/environment';
import { page } from '$app/stores';
import { get } from 'svelte/store';
import { appGoto } from './app-navigation';
import {
	nestedRouteSurfaceHistoryState,
	routeSurfaceBackDelta,
	routeSurfaceHistoryState,
} from './route-surface-history';

const NAVIGATION_OPTIONS = {
	keepFocus: true,
	noScroll: true,
} as const;

export function openRouteSurface(href: string, parentHref: string): void {
	const currentState = get(page).state;
	void appGoto(href, {
		...NAVIGATION_OPTIONS,
		state: routeSurfaceHistoryState(parentHref, currentState),
	});
}

export function navigateWithinRouteSurface(href: string): void {
	const currentState = get(page).state;
	if (!currentState.routeSurfaceParent) {
		void appGoto(href, {
			...NAVIGATION_OPTIONS,
			replaceState: true,
			state: currentState,
		});
		return;
	}
	void appGoto(href, {
		...NAVIGATION_OPTIONS,
		state: nestedRouteSurfaceHistoryState(currentState),
	});
}

export function replaceRouteSurface(href: string): void {
	const currentState = get(page).state;
	void appGoto(href, {
		...NAVIGATION_OPTIONS,
		replaceState: true,
		state: currentState,
	});
}

export function closeRouteSurface(parentHref: string): void {
	const currentState = get(page).state;
	const backDelta = routeSurfaceBackDelta(currentState, parentHref);
	if (
		browser
		&& backDelta !== null
		&& window.history.length > Math.abs(backDelta)
	) {
		window.history.go(backDelta);
		return;
	}
	void appGoto(parentHref, {
		...NAVIGATION_OPTIONS,
		replaceState: true,
		state: {
			...currentState,
			routeSurfaceParent: undefined,
			routeSurfaceDepth: undefined,
		},
	});
}
