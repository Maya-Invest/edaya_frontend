import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
import type { NotificationsPageSlice } from './lib/notifications-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadNotificationsSlice, queryNotificationsListPage } from './lib/notifications-queries';
import { runNotificationsRouteMutation } from './lib/notifications-route-mutation';

const NOTIFICATIONS_VERSION_FAMILIES = [] as const;

const NOTIFICATIONS_PAGE_STATE_KEY = Symbol('notifications-page-state');

export type { NotificationsPageSlice };

export class NotificationsPageState {
	slice = $state<NotificationsPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(NOTIFICATIONS_VERSION_FAMILIES);

	applySlice(data: NotificationsPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get schoolId() {
		return this.slice?.schoolId ?? null;
	}

	get document() {
		return this.slice?.document ?? null;
	}

	applyDocument(document: SchoolNotificationTemplatesRow) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			document,
		};
	}

	queryListPage() {
		return queryNotificationsListPage(this);
	}

	async refreshSlice() {
		const data = await loadNotificationsSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async updateTemplates(input: {
		templates: Record<string, unknown>;
		expectedUpdatedAt?: string | null;
		successMessage?: string;
	}): Promise<SchoolNotificationTemplatesRow | null> {
		const schoolId = this.schoolId;
		const previous = this.document;
		if (!schoolId || !previous) {
			return null;
		}

		const client = getBrowserSchoolClient();
		return runNotificationsRouteMutation({
			request: () => client.commands.updateSchoolNotificationTemplates({
				schoolId,
				templates: input.templates,
				expectedUpdatedAt: input.expectedUpdatedAt ?? null,
			}),
			successMessage: input.successMessage,
			apply: () => {},
			rollback: () => {
				if (previous) {
					this.applyDocument(previous);
				}
			},
			onSuccess: result => this.applyDocument(result),
		});
	}

	async resetTemplates(input: {
		templateKey?: NotificationTemplateKey;
		successMessage?: string;
	}): Promise<SchoolNotificationTemplatesRow | null> {
		const schoolId = this.schoolId;
		const previous = this.document;
		if (!schoolId || !previous) {
			return null;
		}

		const client = getBrowserSchoolClient();
		return runNotificationsRouteMutation({
			request: () => client.commands.resetSchoolNotificationTemplates({
				schoolId,
				templateKey: input.templateKey,
			}),
			successMessage: input.successMessage,
			apply: () => {},
			rollback: () => {
				if (previous) {
					this.applyDocument(previous);
				}
			},
			onSuccess: result => this.applyDocument(result),
		});
	}
}

export function setNotificationsPageState(state: NotificationsPageState) {
	setContext(NOTIFICATIONS_PAGE_STATE_KEY, state);
}

export function getNotificationsPageState() {
	return getContext<NotificationsPageState>(NOTIFICATIONS_PAGE_STATE_KEY);
}
