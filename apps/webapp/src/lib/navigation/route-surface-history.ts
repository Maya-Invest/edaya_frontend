export function routeSurfaceHistoryState(
	parentHref: string,
	current: App.PageState = {},
): App.PageState {
	return {
		...current,
		routeSurfaceParent: parentHref,
		routeSurfaceDepth: 1,
	};
}

export function nestedRouteSurfaceHistoryState(
	current: App.PageState,
): App.PageState {
	if (!current.routeSurfaceParent) {
		return current;
	}
	return {
		...current,
		routeSurfaceDepth: Math.max(1, current.routeSurfaceDepth ?? 1) + 1,
	};
}

export function routeSurfaceBackDelta(
	state: App.PageState,
	parentHref: string,
): number | null {
	if (state.routeSurfaceParent !== parentHref) {
		return null;
	}
	return -Math.max(1, state.routeSurfaceDepth ?? 1);
}
