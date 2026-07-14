import type { Announcement, AnnouncementPriority, AnnouncementTarget, AnnouncementTargetKind } from '$lib/types/school';
import type { AnnouncementsPageState } from '../announcements-page.svelte';
import { announcementExpiresAtIso } from '$lib/api/announcement-expires-at';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';
import { runAnnouncementRouteMutation } from './announcement-route-mutation';

export async function createAnnouncementOnPage(
	state: AnnouncementsPageState,
	input: {
		title: string;
		content: string;
		priority: AnnouncementPriority;
		expiresAt?: string;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	const announcementId = `ann-${Date.now().toString(36)}`;
	const optimistic: Announcement = {
		id: announcementId,
		title: input.title.trim(),
		content: input.content.trim(),
		status: 'draft',
		priority: input.priority,
		createdAt: new Date().toISOString(),
		expiresAt: announcementExpiresAtIso(input.expiresAt),
		createdBy: authSession.userId ?? undefined,
		targets: [],
	};

	const result = await runAnnouncementRouteMutation({
		request: () => client.commands.createAnnouncement({
			id: announcementId,
			schoolId,
			title: input.title.trim(),
			content: input.content.trim(),
			priority: input.priority,
			createdBy: authSession.userId ?? undefined,
			expiresAt: announcementExpiresAtIso(input.expiresAt),
			createdAt: new Date().toISOString(),
		}),
		successMessage: input.successMessage,
		apply: () => {
			state.appendAnnouncement(optimistic);
		},
		rollback: () => {
			state.removeAnnouncement(announcementId);
		},
	});

	return result ? announcementId : null;
}

export async function updateAnnouncementOnPage(
	state: AnnouncementsPageState,
	input: {
		announcementId: string;
		title: string;
		content: string;
		priority: AnnouncementPriority;
		expiresAt?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	const previous = state.findAnnouncement(input.announcementId);
	if (!schoolId || !previous || previous.status !== 'draft') {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	let existing;
	try {
		existing = await client.entities.announcements.get(input.announcementId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const patch = {
		title: input.title.trim(),
		content: input.content.trim(),
		priority: input.priority,
		expiresAt: announcementExpiresAtIso(input.expiresAt),
	};

	const result = await runAnnouncementRouteMutation({
		request: () => client.entities.announcements.save({
			...existing,
			...patch,
		}),
		successMessage: input.successMessage,
		apply: () => {
			state.patchAnnouncement(input.announcementId, patch);
		},
		rollback: () => {
			state.patchAnnouncement(input.announcementId, previous);
		},
	});

	return result !== null;
}

export async function addAnnouncementTargetOnPage(
	state: AnnouncementsPageState,
	input: {
		announcementId: string;
		targetKind: AnnouncementTargetKind;
		targetId?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findAnnouncement(input.announcementId);
	if (!previous || previous.status !== 'draft') {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const targetId = `tgt-${Date.now().toString(36)}`;
	const optimistic: AnnouncementTarget = {
		id: targetId,
		announcementId: input.announcementId,
		targetKind: input.targetKind,
		targetId: input.targetId,
	};

	const result = await runAnnouncementRouteMutation({
		request: () => client.commands.addTarget({
			id: targetId,
			announcementId: input.announcementId,
			targetKind: input.targetKind,
			targetId: input.targetId,
			createdAt: new Date().toISOString(),
		}),
		successMessage: input.successMessage,
		apply: () => {
			state.appendAnnouncementTarget(input.announcementId, optimistic);
		},
		rollback: () => {
			state.removeAnnouncementTarget(input.announcementId, targetId);
		},
	});

	return result !== null;
}

export async function publishAnnouncementOnPage(
	state: AnnouncementsPageState,
	input: {
		announcementId: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findAnnouncement(input.announcementId);
	if (!previous || previous.status !== 'draft' || previous.targets.length === 0) {
		toast.error(get(t)('announcements.publishNeedsTargets'));
		return false;
	}

	const result = await runAnnouncementRouteMutation({
		request: () => client.commands.publishAnnouncement({
			announcementId: input.announcementId,
		}),
		successMessage: input.successMessage,
		apply: () => {
			state.patchAnnouncement(input.announcementId, {
				status: 'published',
				publishedAt: new Date().toISOString(),
			});
		},
		rollback: () => {
			state.patchAnnouncement(input.announcementId, {
				status: previous.status,
				publishedAt: previous.publishedAt,
			});
		},
	});

	return result !== null;
}

export async function deleteAnnouncementOnPage(
	state: AnnouncementsPageState,
	announcementId: string,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = state.findAnnouncement(announcementId);
	if (!previous) {
		return false;
	}

	const result = await runAnnouncementRouteMutation({
		request: () => client.entities.announcements.delete({ id: announcementId }),
		successMessage: opts?.successMessage,
		apply: () => {
			state.removeAnnouncement(announcementId);
		},
		rollback: () => {
			state.appendAnnouncement(previous);
		},
	});

	return result !== null;
}
