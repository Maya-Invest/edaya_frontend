import { afterNavigate } from '$app/navigation';

export interface VersionInvalidatable {
	invalidateIfStale: () => void | Promise<void>;
}

/** Register pull-based version invalidation for a route state instance. */
export function registerVersionInvalidation(state: VersionInvalidatable) {
	afterNavigate(() => {
		void state.invalidateIfStale();
	});
}
