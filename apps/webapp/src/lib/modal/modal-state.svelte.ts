import { listHref } from '$lib/list/list-filters-state.svelte';
import { readModal, readModalTarget, writeModal } from '$lib/modal/modal-url';
import { appGoto } from '$lib/navigation/app-navigation';

export interface UrlSyncedModalsConfig<T extends string> {
	allowed: () => readonly T[];
	getUrl: () => URL;
	goto: (href: string) => void;
}

export class UrlSyncedModalsState<T extends string> {
	active = $state<T | null>(null);
	target = $state<string | null>(null);
	ready = $state(false);

	constructor(private readonly config: UrlSyncedModalsConfig<T>) {}

	hydrate() {
		const url = this.config.getUrl();
		const next = readModal(url, this.config.allowed());
		const nextTarget = readModalTarget(url);
		if (!this.ready || this.active !== next || this.target !== nextTarget) {
			this.active = next;
			this.target = nextTarget;
			this.ready = true;
		}
	}

	isOpen(key: T): boolean {
		return this.active === key;
	}

	open(key: T, options?: { target?: string }) {
		if (!this.config.allowed().includes(key)) {
			return;
		}
		const nextTarget = options?.target ?? null;
		const currentUrl = this.config.getUrl();
		const href = writeModal(currentUrl, key, nextTarget);
		if (this.active === key && this.target === nextTarget && href === listHref(currentUrl)) {
			return;
		}
		this.active = key;
		this.target = nextTarget;
		if (href === listHref(currentUrl)) {
			return;
		}
		this.config.goto(href);
	}

	close() {
		if (this.active === null) {
			return;
		}
		const currentUrl = this.config.getUrl();
		const href = writeModal(currentUrl, null);
		this.active = null;
		this.target = null;
		if (href === listHref(currentUrl)) {
			return;
		}
		this.config.goto(href);
	}
}

export function createUrlSyncedModals<T extends string>(config: {
	allowed: readonly T[] | (() => readonly T[]);
	getUrl: () => URL;
	goto?: (href: string) => void;
}): UrlSyncedModalsState<T> {
	let allowedFn: () => readonly T[];
	if (typeof config.allowed === 'function') {
		allowedFn = config.allowed;
	}
	else {
		const values = config.allowed;
		allowedFn = () => values;
	}

	return new UrlSyncedModalsState({
		allowed: allowedFn,
		getUrl: config.getUrl,
		goto: config.goto ?? (href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true })),
	});
}

/** Per-modal bindable open flag synced with the URL — call from component init. */
export class ModalUrlBind<T extends string> {
	open = $state(false);
	private urlSynced = false;

	constructor(
		private readonly modals: UrlSyncedModalsState<T>,
		private readonly key: T,
	) {
		// Apply URL state before the push effect so a stale `open = false` does not call close().
		$effect.pre(() => {
			if (!this.modals.ready) {
				return;
			}
			this.open = this.modals.isOpen(this.key);
			this.urlSynced = true;
		});

		$effect(() => {
			if (!this.modals.ready || !this.urlSynced) {
				return;
			}
			const urlOpen = this.modals.isOpen(this.key);
			if (this.open && !urlOpen) {
				this.modals.open(this.key);
			}
			else if (!this.open && urlOpen) {
				this.modals.close();
			}
		});
	}
}

export function bindUrlModal<T extends string>(
	modals: UrlSyncedModalsState<T>,
	key: T,
): ModalUrlBind<T> {
	return new ModalUrlBind(modals, key);
}

export function closeUrlModal(modals: UrlSyncedModalsState<string>) {
	return (open: boolean) => {
		if (!open) {
			modals.close();
		}
	};
}
