import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Announcement, AnnouncementPriority, AnnouncementStatus, AnnouncementTarget } from '$lib/types/school';
import { recordsForFieldIds } from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type AnnouncementRaw = components['schemas']['Announcement'];
type AnnouncementTargetRaw = components['schemas']['AnnouncementTarget'];

export interface AnnouncementSources {
	announcementsRaw: AnnouncementRaw[];
	announcementTargetsRaw: AnnouncementTargetRaw[];
}

function formatDate(value: unknown): string | undefined {
	if (!value) {
		return undefined;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === 'string') {
		return value;
	}
	return String(value);
}

function resolveStatus(raw: AnnouncementRaw): AnnouncementStatus {
	if (raw.status) {
		return raw.status;
	}
	return raw.publishedAt ? 'published' : 'draft';
}

export async function fetchAnnouncementSources(
	client: SchoolClient,
	schoolId: string,
): Promise<AnnouncementSources> {
	const announcementsRaw = (await client.entities.announcements.list({ schoolId })) ?? [];
	const announcementIds = announcementsRaw.map(announcement => announcement.id);
	const announcementTargetsRaw = announcementIds.length > 0
		? (await client.entities.announcementTargets.list(recordsForFieldIds('announcementId', announcementIds))) ?? []
		: [];

	return {
		announcementsRaw,
		announcementTargetsRaw,
	};
}

export function mapAnnouncements(sources: AnnouncementSources): Announcement[] {
	const targetsByAnnouncement = new Map<string, AnnouncementTarget[]>();
	for (const target of sources.announcementTargetsRaw) {
		const current = targetsByAnnouncement.get(target.announcementId) ?? [];
		current.push({
			id: target.id,
			announcementId: target.announcementId,
			targetKind: target.targetKind,
			targetId: target.targetId ?? undefined,
		});
		targetsByAnnouncement.set(target.announcementId, current);
	}

	return sources.announcementsRaw
		.map(announcement => ({
			id: announcement.id,
			title: announcement.title,
			content: announcement.content,
			status: resolveStatus(announcement),
			priority: announcement.priority as AnnouncementPriority,
			createdAt: formatDate(announcement.createdAt) ?? new Date().toISOString(),
			publishedAt: formatDate(announcement.publishedAt),
			expiresAt: formatDate(announcement.expiresAt),
			createdBy: announcement.createdBy ?? undefined,
			targets: targetsByAnnouncement.get(announcement.id) ?? [],
		}))
		.sort((left, right) => {
			const leftDate = left.publishedAt ?? left.createdAt;
			const rightDate = right.publishedAt ?? right.createdAt;
			return rightDate.localeCompare(leftDate);
		});
}

export async function fetchAnnouncements(client: SchoolClient, schoolId: string): Promise<Announcement[]> {
	const sources = await fetchAnnouncementSources(client, schoolId);
	return mapAnnouncements(sources);
}
