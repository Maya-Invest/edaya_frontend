import type { NotificationSettingsPageSlice } from './lib/notification-settings-helpers';
import { saveGuardianNotificationPreferencesMutation, saveNotificationContactMutation } from '$lib/api/mutations/notifications.mutations';
import { authSession } from '$lib/auth/session.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadNotificationSettingsSlice, queryNotificationSettingsListPage } from './lib/notification-settings-queries';

const NOTIFICATION_SETTINGS_VERSION_FAMILIES = ['guardians', 'students', 'inbox'] as const;

const NOTIFICATION_SETTINGS_PAGE_STATE_KEY = Symbol('notification-settings-page-state');

export type { NotificationSettingsPageSlice };

export class NotificationSettingsPageState {
	performSaveGuardianNotificationPreferences = (...args: Parameters<typeof saveGuardianNotificationPreferencesMutation>) => saveGuardianNotificationPreferencesMutation(...args);

	performSaveNotificationContact = (...args: Parameters<typeof saveNotificationContactMutation>) => saveNotificationContactMutation(...args);

	slice = $state<NotificationSettingsPageSlice | null>(null);
	private generation = 0;
	private loadedIdentity = $state('');
	identity() { return JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.sessionKind, authSession.userId]); }
	dispose() {
		this.generation += 1;
		this.slice = null;
	}

	private readonly versions = new RouteVersionSnapshot(NOTIFICATION_SETTINGS_VERSION_FAMILIES);

	applySlice(data: NotificationSettingsPageSlice) {
		this.slice = data;
		this.loadedIdentity = this.identity();
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get data() {
		return this.loadedIdentity === this.identity() ? this.slice : null;
	}

	queryListPage() {
		return queryNotificationSettingsListPage(this);
	}

	async refreshSlice() {
		const generation = ++this.generation;
		const identity = this.identity();
		const data = await loadNotificationSettingsSlice();
		if (generation === this.generation && identity === this.identity())
			this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}
}

export function setNotificationSettingsPageState(state: NotificationSettingsPageState) {
	setContext(NOTIFICATION_SETTINGS_PAGE_STATE_KEY, state);
}

export function getNotificationSettingsPageState() {
	return getContext<NotificationSettingsPageState>(NOTIFICATION_SETTINGS_PAGE_STATE_KEY);
}
