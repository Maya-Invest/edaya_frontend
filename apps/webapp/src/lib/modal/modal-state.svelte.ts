import { listHref } from '$lib/list/list-filters-state.svelte';
import {
	MODAL_QUERY_KEY,
	readModal,
	readModalStep,
	readModalTab,
	readModalTarget,
	writeModalSurface,
} from '$lib/modal/modal-url';
import {
	closeRouteSurface,
	navigateWithinRouteSurface,
	openRouteSurface,
	replaceRouteSurface,
} from '$lib/navigation/route-surface-navigation';

export interface UrlSyncedModalsConfig<T extends string> {
	allowed: () => readonly T[];
	owned: () => readonly T[];
	allowedSteps: () => readonly string[];
	allowedTabs: () => readonly string[];
	getUrl: () => URL;
}

export class UrlSyncedModalsState<T extends string> {
	active = $state<T | null>(null);
	target = $state<string | null>(null);
	step = $state<string | null>(null);
	tab = $state<string | null>(null);
	ready = $state(false);

	constructor(private readonly config: UrlSyncedModalsConfig<T>) {}

	hydrate() {
		const url = this.config.getUrl();
		const rawModal = url.searchParams.get(MODAL_QUERY_KEY);
		const next = readModal(url, this.config.allowed());
		const ownsCurrentSurface = rawModal === null
			|| this.config.owned().includes(rawModal as T);
		const nextTarget = next ? readModalTarget(url) : null;
		const nextStep = next ? readModalStep(url, this.config.allowedSteps()) : null;
		const nextTab = next ? readModalTab(url, this.config.allowedTabs()) : null;
		const canonicalHref = writeModalSurface(url, {
			modal: next,
			target: nextTarget,
			step: nextStep,
			tab: nextTab,
		});
		if (ownsCurrentSurface && canonicalHref !== listHref(url)) {
			if (rawModal !== null && next === null) {
				closeRouteSurface(canonicalHref);
			}
			else {
				replaceRouteSurface(canonicalHref);
			}
		}
		if (
			!this.ready
			|| this.active !== next
			|| this.target !== nextTarget
			|| this.step !== nextStep
			|| this.tab !== nextTab
		) {
			this.active = next;
			this.target = nextTarget;
			this.step = nextStep;
			this.tab = nextTab;
			this.ready = true;
		}
	}

	isOpen(key: T): boolean {
		return this.active === key;
	}

	open(key: T, options?: { target?: string; step?: string; tab?: string }) {
		if (!this.config.allowed().includes(key)) {
			return;
		}
		const nextTarget = options?.target ?? null;
		const nextStep = this.allowedValue(options?.step, this.config.allowedSteps());
		const nextTab = this.allowedValue(options?.tab, this.config.allowedTabs());
		const currentUrl = this.config.getUrl();
		const parentHref = writeModalSurface(currentUrl, { modal: null });
		const href = writeModalSurface(currentUrl, {
			modal: key,
			target: nextTarget,
			step: nextStep,
			tab: nextTab,
		});
		if (
			this.active === key
			&& this.target === nextTarget
			&& this.step === nextStep
			&& this.tab === nextTab
			&& href === listHref(currentUrl)
		) {
			return;
		}
		const opening = this.active === null;
		this.active = key;
		this.target = nextTarget;
		this.step = nextStep;
		this.tab = nextTab;
		if (href === listHref(currentUrl)) {
			return;
		}
		if (opening) {
			openRouteSurface(href, parentHref);
		}
		else {
			navigateWithinRouteSurface(href);
		}
	}

	close() {
		if (this.active === null) {
			return;
		}
		const currentUrl = this.config.getUrl();
		const href = writeModalSurface(currentUrl, { modal: null });
		this.active = null;
		this.target = null;
		this.step = null;
		this.tab = null;
		if (href === listHref(currentUrl)) {
			return;
		}
		closeRouteSurface(href);
	}

	setStep(step: string | null) {
		if (this.active === null) {
			return;
		}
		const nextStep = this.allowedValue(step ?? undefined, this.config.allowedSteps());
		this.navigateSubview({ step: nextStep, tab: this.tab });
	}

	replaceStep(step: string | null) {
		if (this.active === null) {
			return;
		}
		const nextStep = this.allowedValue(step ?? undefined, this.config.allowedSteps());
		this.navigateSubview({ step: nextStep, tab: this.tab }, true);
	}

	setTab(tab: string | null) {
		if (this.active === null) {
			return;
		}
		const nextTab = this.allowedValue(tab ?? undefined, this.config.allowedTabs());
		this.navigateSubview({ step: this.step, tab: nextTab });
	}

	replaceTab(tab: string | null) {
		if (this.active === null) {
			return;
		}
		const nextTab = this.allowedValue(tab ?? undefined, this.config.allowedTabs());
		this.navigateSubview({ step: this.step, tab: nextTab }, true);
	}

	private allowedValue(value: string | undefined, allowed: readonly string[]): string | null {
		if (!value || !allowed.includes(value)) {
			return null;
		}
		return value;
	}

	private navigateSubview(
		value: { step: string | null; tab: string | null },
		replace = false,
	) {
		if (this.active === null) {
			return;
		}
		const currentUrl = this.config.getUrl();
		const href = writeModalSurface(currentUrl, {
			modal: this.active,
			target: this.target,
			step: value.step,
			tab: value.tab,
		});
		if (href === listHref(currentUrl)) {
			return;
		}
		this.step = value.step;
		this.tab = value.tab;
		if (replace) {
			replaceRouteSurface(href);
		}
		else {
			navigateWithinRouteSurface(href);
		}
	}
}

export function createUrlSyncedModals<T extends string>(config: {
	allowed: readonly T[] | (() => readonly T[]);
	owned?: readonly T[] | (() => readonly T[]);
	allowedSteps?: readonly string[] | (() => readonly string[]);
	allowedTabs?: readonly string[] | (() => readonly string[]);
	getUrl: () => URL;
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
		owned: config.owned ? normalizeTypedAllowed(config.owned) : allowedFn,
		allowedSteps: normalizeAllowed(config.allowedSteps),
		allowedTabs: normalizeAllowed(config.allowedTabs),
		getUrl: config.getUrl,
	});
}

function normalizeTypedAllowed<T extends string>(
	value: readonly T[] | (() => readonly T[]),
): () => readonly T[] {
	if (typeof value === 'function') {
		return value;
	}
	return () => value;
}

function normalizeAllowed(
	value: readonly string[] | (() => readonly string[]) | undefined,
): () => readonly string[] {
	if (typeof value === 'function') {
		return value;
	}
	const values = value ?? [];
	return () => values;
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
