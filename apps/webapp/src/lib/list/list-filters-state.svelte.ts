import { onDestroy } from 'svelte';

export function listHref(url: URL): string {
	return `${url.pathname}${url.search}`;
}

function filtersEqual<T extends Record<string, string>>(left: T, right: T): boolean {
	for (const key of Object.keys(left)) {
		if (left[key as keyof T] !== right[key as keyof T]) {
			return false;
		}
	}
	return true;
}

export interface ListFiltersSyncConfig<T extends Record<string, string>> {
	getUrl: () => URL;
	write: (url: URL, values: T) => string;
	goto: (href: string) => void;
	debounceMs?: number;
}

export class ListFiltersState<T extends Record<string, string>> {
	values = $state<T>({} as T);
	ready = $state(false);

	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly config: ListFiltersSyncConfig<T>,
		readInitial?: () => T,
	) {
		if (readInitial) {
			this.values = { ...readInitial() };
			this.ready = true;
		}
		onDestroy(() => {
			clearTimeout(this.timer);
		});
	}

	hydrate(next: T) {
		if (this.ready && filtersEqual(this.values, next)) {
			return;
		}
		// Debounced URL sync can lag behind in-memory edits — keep local values until it flushes.
		if (this.ready && this.timer !== undefined) {
			const merged = { ...next, ...this.values };
			if (!filtersEqual(this.values, merged)) {
				this.values = merged;
			}
			return;
		}
		this.values = { ...next };
		this.ready = true;
	}

	setField<K extends keyof T>(key: K, value: T[K]) {
		this.values = { ...this.values, [key]: value };
		this.scheduleSync();
	}

	patch(partial: Partial<T>) {
		this.values = { ...this.values, ...partial };
		this.scheduleSync();
	}

	/** Apply filter edits and flush to the URL immediately (sort, facet selects). */
	patchImmediate(partial: Partial<T>) {
		if (!this.ready) {
			return;
		}
		this.values = { ...this.values, ...partial };
		clearTimeout(this.timer);
		this.timer = undefined;
		this.syncNow();
	}

	scheduleSync() {
		if (!this.ready) {
			return;
		}
		clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.timer = undefined;
			this.syncNow();
		}, this.config.debounceMs ?? 250);
	}

	syncNow() {
		if (!this.ready) {
			return;
		}
		clearTimeout(this.timer);
		this.timer = undefined;
		const currentUrl = this.config.getUrl();
		const href = this.config.write(currentUrl, this.values);
		if (href === listHref(currentUrl)) {
			return;
		}

		this.config.goto(href);
	}
}
