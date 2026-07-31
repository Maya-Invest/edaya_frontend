import type { InboxPageSlice } from './lib/inbox-helpers';
import { markDeliveryReadMutation } from '$lib/api/mutations/notifications.mutations';
import { entityVersions } from '$lib/entity-versions.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { inboxDeliveryIdFromUrl } from './lib/inbox-helpers';
import { loadInboxSlice, queryInboxListPage } from './lib/inbox-queries';
import { runInboxRouteMutation } from './lib/inbox-route-mutation';

const INBOX_VERSION_FAMILIES = ['inbox'] as const satisfies readonly import('$lib/entity-versions.svelte').EntityVersionKey[];

const INBOX_PAGE_STATE_KEY = Symbol('inbox-page-state');

export type { InboxPageSlice };

export class InboxPageState {
	slice = $state<InboxPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(INBOX_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {}

	applySlice(data: InboxPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get deliveries() {
		return this.slice?.deliveries ?? [];
	}

	get subjectId() {
		return this.slice?.subjectId ?? null;
	}

	get selectedId() {
		return inboxDeliveryIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.deliveries.find(delivery => delivery.id === id);
	}

	queryListPage() {
		return queryInboxListPage(this);
	}

	async refreshSlice() {
		const data = await loadInboxSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	markDeliveryReadLocally(deliveryId: string) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			deliveries: this.slice.deliveries.map(delivery =>
				delivery.id === deliveryId ? { ...delivery, status: 'read' as const } : delivery,
			),
		};
	}

	async markDeliveryRead(deliveryId: string): Promise<boolean> {
		const previous = this.deliveries.find(delivery => delivery.id === deliveryId);
		if (!previous || previous.status === 'read') {
			return true;
		}

		const result = await runInboxRouteMutation({
			request: async () => {
				const ok = await markDeliveryReadMutation(deliveryId);
				if (!ok) {
					throw new Error('Failed to mark delivery read');
				}
				return deliveryId;
			},
			apply: () => this.markDeliveryReadLocally(deliveryId),
			rollback: () => {
				if (previous && this.slice) {
					this.slice = {
						...this.slice,
						deliveries: this.slice.deliveries.map(delivery =>
							delivery.id === deliveryId ? previous : delivery,
						),
					};
				}
			},
			onSuccess: () => {
				entityVersions.bump('inbox');
			},
		});
		return result !== null;
	}
}

export function setInboxPageState(state: InboxPageState) {
	setContext(INBOX_PAGE_STATE_KEY, state);
}

export function getInboxPageState() {
	return getContext<InboxPageState>(INBOX_PAGE_STATE_KEY);
}
