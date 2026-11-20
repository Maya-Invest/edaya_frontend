import { ApiError } from '@maya-invest/edaya-api-client';
import { SvelteSet } from 'svelte/reactivity';

interface CursorPage<Row> {
	items: Row[];
	total: number;
	nextCursor: string | null;
}

export class ScopedCursorList<Selection extends object, Row extends { id: string }, Extra extends object = object> {
	private page = $state.raw<CursorPage<Row> & Extra>();
	private loadedKey = $state('');
	private generation = 0;
	private pending?: AbortController;
	loadingMore = $state(false);
	failed = $state<'more' | 'refresh'>();
	denied = $state(false);

	constructor(
		private selection: () => Selection,
		private onScopeChange: () => void,
		private read: (selection: Selection, cursor?: string, signal?: AbortSignal) => Promise<CursorPage<Row> & Extra>,
		private readExport: (selection: Selection) => Promise<Row[]>,
	) {}

	get key() {
		return JSON.stringify(this.selection());
	}

	get current() {
		return this.loadedKey === this.key ? this.page : undefined;
	}

	clear() {
		this.generation++;
		this.pending?.abort();
		this.loadingMore = false;
		this.page = undefined;
		this.loadedKey = '';
		this.failed = undefined;
	}

	private deny() {
		this.clear();
		this.denied = true;
		this.onScopeChange();
	}

	async refresh(signal?: AbortSignal) {
		const generation = ++this.generation;
		const key = this.key;
		this.pending?.abort();
		this.loadingMore = false;
		this.failed = undefined;
		try {
			const page = await this.read(this.selection(), undefined, signal);
			signal?.throwIfAborted();
			if (key === this.key && generation === this.generation) {
				this.denied = false;
				this.loadedKey = key;
				this.page = page;
				return true;
			}
			return false;
		}
		catch (error) {
			if (key === this.key && generation === this.generation && !signal?.aborted) {
				if (error instanceof ApiError && [401, 403].includes(error.status))
					this.deny();
				else this.failed = 'refresh';
			}
			throw error;
		}
	}

	async more() {
		const page = this.current;
		const selection = this.selection();
		if (!page?.nextCursor || this.loadingMore)
			return;
		const generation = this.generation;
		const key = this.key;
		const controller = new AbortController();
		this.pending = controller;
		this.loadingMore = true;
		this.failed = undefined;
		try {
			const next = await this.read(selection, page.nextCursor, controller.signal);
			if (generation !== this.generation || key !== this.key || controller.signal.aborted)
				return;
			const seen = new SvelteSet(page.items.map(row => row.id));
			this.page = { ...next, items: [...page.items, ...next.items.filter(row => !seen.has(row.id))] };
		}
		catch (error) {
			if (generation !== this.generation || key !== this.key || controller.signal.aborted)
				return;
			if (error instanceof ApiError && [401, 403].includes(error.status)) {
				this.deny();
			}
			else if (error instanceof ApiError && error.status === 400) {
				this.clear();
				this.onScopeChange();
				await this.refresh().catch(() => {});
			}
			else {
				this.failed = 'more';
			}
		}
		finally {
			if (this.pending === controller) {
				this.pending = undefined;
				this.loadingMore = false;
			}
		}
	}

	async export(filters: Partial<Selection>) {
		const key = this.key;
		try {
			const rows = await this.readExport({ ...this.selection(), ...filters });
			if (key !== this.key)
				throw new DOMException('Selection changed', 'AbortError');
			return rows;
		}
		catch (error) {
			if (key === this.key && error instanceof ApiError && [401, 403].includes(error.status))
				this.deny();
			throw error;
		}
	}
}
