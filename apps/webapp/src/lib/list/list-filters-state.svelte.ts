import { onDestroy } from 'svelte';

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

	scheduleSync() {
		if (!this.ready) {
			return;
		}
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.syncNow(), this.config.debounceMs ?? 250);
	}

	syncNow() {
		if (!this.ready) {
			return;
		}
		clearTimeout(this.timer);
		const href = this.config.write(this.config.getUrl(), this.values);
		this.config.goto(href);
	}
}
