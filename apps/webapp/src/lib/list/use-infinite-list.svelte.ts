const DEFAULT_PAGE_SIZE = 50;

/** Réponse paginée cursor — à brancher sur le BFF quand `nextCursor` est exposé. */
export interface CursorPage<T> {
	items: T[];
	nextCursor: string | null;
}

export type CursorFetcher<T> = (cursor: string | null) => Promise<CursorPage<T>>;

/**
 * Windowing client-side (Phase 3 par défaut).
 * Remplacer par `useCursorInfiniteList` quand l'API liste expose `nextCursor`.
 */
export function useInfiniteList<T>(source: () => T[], pageSize = DEFAULT_PAGE_SIZE) {
	let limit = $state(pageSize);

	const items = $derived(source());
	const visible = $derived(items.slice(0, limit));
	const hasMore = $derived(limit < items.length);

	$effect(() => {
		void items.length;
		limit = pageSize;
	});

	function loadMore() {
		limit = Math.min(limit + pageSize, items.length);
	}

	return {
		get visible() {
			return visible;
		},
		get hasMore() {
			return hasMore;
		},
		get total() {
			return items.length;
		},
		loadMore,
	};
}

/**
 * Pagination cursor API — stub prêt pour branchement BFF.
 * Aujourd'hui : charge la première page uniquement ; `loadMore` enchaîne via `nextCursor`.
 */
export function useCursorInfiniteList<T>(fetchPage: CursorFetcher<T>, pageSize = DEFAULT_PAGE_SIZE) {
	let items = $state<T[]>([]);
	let nextCursor = $state<string | null>(null);
	let loading = $state(false);
	let initialized = $state(false);

	async function fetchNext(cursor: string | null) {
		loading = true;
		try {
			const page = await fetchPage(cursor);
			items = cursor ? [...items, ...page.items] : page.items;
			nextCursor = page.nextCursor;
		}
		finally {
			loading = false;
		}
	}

	$effect(() => {
		if (initialized)
			return;
		initialized = true;
		void fetchNext(null);
	});

	function loadMore() {
		if (!nextCursor || loading)
			return;
		void fetchNext(nextCursor);
	}

	return {
		get visible() {
			return items;
		},
		get hasMore() {
			return nextCursor !== null;
		},
		get total() {
			return items.length;
		},
		get loading() {
			return loading;
		},
		loadMore,
		pageSize,
	};
}

export type OffsetPageFetcher<T> = (offset: number, limit: number) => Promise<{ items: T[]; total: number }>;

function hasStringId(value: unknown): value is { id: string } {
	return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string';
}

function appendUniqueById<T>(existing: readonly T[], incoming: readonly T[]): T[] {
	if (existing.length === 0) {
		return [...incoming];
	}
	if (!hasStringId(existing[0]) || !incoming.every(hasStringId)) {
		return [...existing, ...incoming];
	}

	const identifiedExisting = existing as ReadonlyArray<T & { id: string }>;
	const identifiedIncoming = incoming as ReadonlyArray<T & { id: string }>;
	const seen: Record<string, true> = Object.create(null);
	for (const item of identifiedExisting) {
		seen[item.id] = true;
	}
	const merged = [...existing];
	for (const item of identifiedIncoming) {
		if (!seen[item.id]) {
			seen[item.id] = true;
			merged.push(item);
		}
	}
	return merged;
}

/**
 * Server-side infinite scroll — loads pages via `$limit` / `$offset` and appends on scroll.
 * Pass `getResetKey` to reload from the first page when filters change.
 */
export function useOffsetInfiniteList<T>(
	fetchPage: OffsetPageFetcher<T>,
	pageSize = DEFAULT_PAGE_SIZE,
	getResetKey: () => unknown = () => undefined,
) {
	let items = $state<T[]>([]);
	let total = $state(0);
	let offset = $state(0);
	let loading = $state(false);
	let loadingMore = $state(false);
	let generation = 0;
	let loadingMoreOffset: number | null = null;

	async function loadAt(nextOffset: number, append: boolean, requestGeneration: number) {
		if (append) {
			loadingMore = true;
		}
		else {
			loading = true;
		}

		try {
			const page = await fetchPage(nextOffset, pageSize);
			if (requestGeneration !== generation) {
				return;
			}

			items = append ? appendUniqueById(items, page.items) : page.items;
			total = page.total;
			offset = nextOffset + page.items.length;
		}
		finally {
			if (requestGeneration === generation) {
				loading = false;
				if (append && loadingMoreOffset === nextOffset) {
					loadingMoreOffset = null;
				}
				loadingMore = loadingMoreOffset !== null;
			}
		}
	}

	$effect(() => {
		void getResetKey();
		const requestGeneration = ++generation;
		let cancelled = false;

		loading = true;
		loadingMore = false;
		loadingMoreOffset = null;
		items = [];
		offset = 0;
		total = 0;

		void fetchPage(0, pageSize)
			.then((page) => {
				if (cancelled || requestGeneration !== generation) {
					return;
				}
				items = page.items;
				total = page.total;
				offset = page.items.length;
			})
			.finally(() => {
				if (!cancelled && requestGeneration === generation) {
					loading = false;
				}
			});

		return () => {
			cancelled = true;
		};
	});

	function loadMore() {
		if (loading || loadingMoreOffset !== null || items.length >= total) {
			return;
		}

		const nextOffset = offset;
		loadingMoreOffset = nextOffset;
		loadingMore = true;
		void loadAt(nextOffset, true, generation);
	}

	return {
		get visible() {
			return items;
		},
		get hasMore() {
			return items.length < total;
		},
		get total() {
			return total;
		},
		get loading() {
			return loading;
		},
		get loadingMore() {
			return loadingMore;
		},
		loadMore,
		pageSize,
	};
}
