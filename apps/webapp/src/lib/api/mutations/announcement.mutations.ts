import type { AnnouncementPriority, AnnouncementTargetKind } from '$lib/types/school';
import { announcementExpiresAtIso } from '$lib/api/announcement-expires-at';
import { recordsForFieldIds } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function createAnnouncementMutation(input: {
	title: string;
	content: string;
	priority: AnnouncementPriority;
	expiresAt?: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	const announcementId = `ann-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.createAnnouncement({
		id: announcementId,
		schoolId,
		title: input.title.trim(),
		content: input.content.trim(),
		priority: input.priority,
		createdBy: authSession.userId ?? undefined,
		expiresAt: announcementExpiresAtIso(input.expiresAt),
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['announcements'],
	});

	return result ? announcementId : null;
}

export async function updateAnnouncementMutation(input: {
	announcementId: string;
	title: string;
	content: string;
	priority: AnnouncementPriority;
	expiresAt?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
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

	if (existing.status !== 'draft') {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const patch = {
		title: input.title.trim(),
		content: input.content.trim(),
		priority: input.priority,
		expiresAt: announcementExpiresAtIso(input.expiresAt),
	};

	const result = await runMutation(() => client.entities.announcements.save({
		...existing,
		...patch,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['announcements'],
	});

	return result !== null;
}

export async function addAnnouncementTargetMutation(input: {
	announcementId: string;
	targetKind: AnnouncementTargetKind;
	targetId?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	let existing;
	try {
		existing = await client.entities.announcements.get(input.announcementId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	if (existing.status !== 'draft') {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const targetId = `tgt-${Date.now().toString(36)}`;

	const result = await runMutation(() => client.commands.addTarget({
		id: targetId,
		announcementId: input.announcementId,
		targetKind: input.targetKind,
		targetId: input.targetId,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		versionKeys: ['announcements'],
	});

	return result !== null;
}

export async function publishAnnouncementMutation(input: {
	announcementId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	let existing;
	try {
		existing = await client.entities.announcements.get(input.announcementId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const targets = await client.entities.announcementTargets.list(
		recordsForFieldIds('announcementId', [input.announcementId]),
	);
	if (existing.status !== 'draft' || (targets ?? []).length === 0) {
		toast.error(get(t)('announcements.publishNeedsTargets'));
		return false;
	}

	const result = await runMutation(() => client.commands.publishAnnouncement({
		announcementId: input.announcementId,
	}), {
		successMessage: input.successMessage,
		versionKeys: ['announcements'],
	});

	return result !== null;
}
