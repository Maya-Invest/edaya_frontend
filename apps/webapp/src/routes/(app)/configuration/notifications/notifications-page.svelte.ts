import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
import type { NotificationTemplateKey } from '$lib/notification-templates/catalog';
import type { NotificationsPageSlice } from './lib/notifications-helpers';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { hasAnyPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { loadNotificationsSlice, queryNotificationsListPage } from './lib/notifications-queries';
import { runNotificationsRouteMutation } from './lib/notifications-route-mutation';

const NOTIFICATIONS_VERSION_FAMILIES = [] as const;

const NOTIFICATIONS_PAGE_STATE_KEY = Symbol('notifications-page-state');

export type { NotificationsPageSlice };

export class NotificationsPageState {
	slice = $state<NotificationsPageSlice | null>(null);

	private readVersion = 0;

	private readonly versions = new RouteVersionSnapshot(NOTIFICATIONS_VERSION_FAMILIES);

	applySlice(data: NotificationsPageSlice) {
		this.readVersion++;
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.readVersion++;
		this.slice = null;
	}

	get schoolId() {
		return this.slice?.schoolId ?? null;
	}

	get document() {
		return this.slice?.document ?? null;
	}

	applyDocument(document: SchoolNotificationTemplatesRow) {
		if (!this.slice || document.schoolId !== this.slice.schoolId) {
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
		const request = ++this.readVersion;
		const schoolId = authSession.schoolId;
		const actorId = authSession.userId;
		const data = await loadNotificationsSlice();
		if (request === this.readVersion && schoolId === authSession.schoolId && actorId === authSession.userId)
			this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async updateTemplates(input: {
		templates?: Record<string, unknown>;
		invitationSmsEnabled?: boolean;
		expectedUpdatedAt?: string | null;
		successMessage?: string;
	}): Promise<SchoolNotificationTemplatesRow | null> {
		const schoolId = this.schoolId;
		const previous = this.document;
		if (!schoolId || !previous || previous.schoolId !== schoolId || !hasAnyPermission(['SCHOOL_LIFECYCLE_MANAGE'])) {
			return null;
		}

		const actor = authSession.userId;
		const current = () => this.schoolId === schoolId && authSession.schoolId === schoolId && authSession.userId === actor;
		const client = getBrowserSchoolClient();
		return runNotificationsRouteMutation({
			request: () => client.commands.updateSchoolNotificationTemplates({
				schoolId,
				templates: input.templates,
				invitationSmsEnabled: input.invitationSmsEnabled,
				expectedUpdatedAt: input.expectedUpdatedAt ?? null,
			}),
			successMessage: input.successMessage,
			apply: () => {},
			rollback: () => {
				if (current()) {
					this.applyDocument(previous);
				}
			},
			onSuccess: (result) => {
				if (current())
					this.applyDocument(result);
			},
		});
	}

	async resetTemplates(input: {
		templateKey?: NotificationTemplateKey;
		successMessage?: string;
	}): Promise<SchoolNotificationTemplatesRow | null> {
		const schoolId = this.schoolId;
		const previous = this.document;
		if (!schoolId || !previous || previous.schoolId !== schoolId || !hasAnyPermission(['SCHOOL_LIFECYCLE_MANAGE'])) {
			return null;
		}

		const actor = authSession.userId;
		const current = () => this.schoolId === schoolId && authSession.schoolId === schoolId && authSession.userId === actor;
		const client = getBrowserSchoolClient();
		return runNotificationsRouteMutation({
			request: () => client.commands.resetSchoolNotificationTemplates({
				schoolId,
				templateKey: input.templateKey,
			}),
			successMessage: input.successMessage,
			apply: () => {},
			rollback: () => {
				if (current()) {
					this.applyDocument(previous);
				}
			},
			onSuccess: (result) => {
				if (current())
					this.applyDocument(result);
			},
		});
	}
}

export function setNotificationsPageState(state: NotificationsPageState) {
	setContext(NOTIFICATIONS_PAGE_STATE_KEY, state);
}

export function getNotificationsPageState() {
	return getContext<NotificationsPageState>(NOTIFICATIONS_PAGE_STATE_KEY);
}
