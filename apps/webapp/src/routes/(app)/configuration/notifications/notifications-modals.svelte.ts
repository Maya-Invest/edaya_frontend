import type { UrlSyncedModalsState } from '$lib/modal/modal-state.svelte';
import { getContext, setContext } from 'svelte';

const NOTIFICATIONS_MODALS_KEY = Symbol('notifications-modals');

export type NotificationModalsState = UrlSyncedModalsState<'edit' | 'reset-all' | 'reset-key'>;

export function setNotificationModals(modals: NotificationModalsState) {
	setContext(NOTIFICATIONS_MODALS_KEY, modals);
}

export function getNotificationModals(): NotificationModalsState {
	return getContext<NotificationModalsState>(NOTIFICATIONS_MODALS_KEY);
}
