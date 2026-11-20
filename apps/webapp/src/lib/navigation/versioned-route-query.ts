import type { PageLoadMeta } from '$lib/page/load-state';
import type { PageQueryFn, PageQueryRequest } from '$lib/queries/page-query-runtime';
import type { RouteVersionSnapshot } from './route-version-snapshot';

/** Retains only a query callback and URL; entity payloads remain on the owning tab state. */
export class VersionedRouteQuery {
	private reload?: (signal: AbortSignal) => Promise<PageLoadMeta>;
	private refreshing?: AbortController;
	constructor(private readonly versions: Pick<RouteVersionSnapshot, 'markLoaded' | 'hasLoaded' | 'isStale'>) {}
	track<T extends PageLoadMeta>(query: PageQueryFn<T>): (url: URL, request?: PageQueryRequest) => Promise<T> {
		return async (url, request = { signal: new AbortController().signal }) => {
			this.refreshing?.abort();
			this.reload = signal => query(url, { signal });
			const result = await query(url, request);
			if (!request.signal.aborted && result.status !== 'error')
				this.versions.markLoaded();
			return result;
		};
	}

	async invalidateIfStale() {
		if (!this.reload || this.refreshing || !this.versions.hasLoaded() || !this.versions.isStale())
			return;
		const controller = new AbortController();
		this.refreshing = controller;
		try {
			const result = await this.reload(controller.signal);
			if (!controller.signal.aborted && result.status !== 'error')
				this.versions.markLoaded();
		}
		catch {
			// Keep the tab stale for the next navigation; background errors must not escape.
		}
		finally {
			if (this.refreshing === controller)
				this.refreshing = undefined;
		}
	}

	clear() {
		this.refreshing?.abort();
		this.refreshing = undefined;
		this.reload = undefined;
	}
}
