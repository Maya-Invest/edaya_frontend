import { browser } from '$app/environment';
import { page } from '$app/stores';
import {
	MODAL_QUERY_KEY,
	MODAL_STEP_QUERY_KEY,
	MODAL_TAB_QUERY_KEY,
	MODAL_TARGET_QUERY_KEY,
} from '$lib/modal/modal-url';
import { get } from 'svelte/store';
import { appGoto } from './app-navigation';
import {
	nestedRouteSurfaceHistoryState,
	replacementRouteSurfaceHistoryState,
	routeSurfaceBackDelta,
	routeSurfaceHistoryState,
} from './route-surface-history';

// A successful form can close its modal and open a drawer in the same turn.
// Defer history traversal so the drawer can replace that closing modal instead.
let pendingClose: object | null = null;

function cancelPendingClose(): boolean {
	const closing = pendingClose !== null;
	pendingClose = null;
	return closing;
}

const NAVIGATION_OPTIONS = {
	keepFocus: true,
	noScroll: true,
} as const;

export function openRouteSurface(href: string, parentHref: string): void {
	const replaceClosingSurface = cancelPendingClose();
	const currentState = get(page).state;
	void appGoto(href, {
		...NAVIGATION_OPTIONS,
		state: replaceClosingSurface
			? replacementRouteSurfaceHistoryState(parentHref, currentState)
			: routeSurfaceHistoryState(parentHref, currentState),
		replaceState: replaceClosingSurface,
	});
}

export function navigateWithinRouteSurface(href: string): void {
	cancelPendingClose();
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

export function followDrawerTabLink(event: MouseEvent, href: string): void {
	if (
		event.defaultPrevented
		|| event.button !== 0
		|| event.metaKey
		|| event.ctrlKey
		|| event.shiftKey
		|| event.altKey
	) {
		return;
	}
	event.preventDefault();
	navigateWithinRouteSurface(href);
}

export function replaceRouteSurface(href: string): void {
	cancelPendingClose();
	const currentState = get(page).state;
	void appGoto(href, {
		...NAVIGATION_OPTIONS,
		replaceState: true,
		state: currentState,
	});
}

export function closeRouteSurface(parentHref: string): void {
	const request = {};
	pendingClose = request;
	queueMicrotask(() => {
		if (pendingClose !== request)
			return;
		pendingClose = null;
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
	});
}

export function stripModalSearch(url: URL): string {
	const next = new URL(url);
	next.searchParams.delete(MODAL_QUERY_KEY);
	next.searchParams.delete(MODAL_TARGET_QUERY_KEY);
	next.searchParams.delete(MODAL_STEP_QUERY_KEY);
	next.searchParams.delete(MODAL_TAB_QUERY_KEY);
	return next.search;
}

export function listSurfaceHref(listPath: string, url: URL): string {
	return `${listPath}${stripModalSearch(url)}`;
}

export function currentRouteSurfaceHref(url: URL): string {
	return `${url.pathname}${stripModalSearch(url)}`;
}

function hrefWithoutModal(href: string): string {
	return listSurfaceHref(new URL(href, 'http://local').pathname, new URL(href, 'http://local'));
}

export function openDetailDrawer(href: string, parentHref: string): void {
	openRouteSurface(href, hrefWithoutModal(parentHref));
}

export function closeDetailDrawer(parentHref: string): void {
	closeRouteSurface(hrefWithoutModal(parentHref));
}
