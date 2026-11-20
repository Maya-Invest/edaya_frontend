import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Announcement, AnnouncementPriority, AnnouncementStatus, AnnouncementTarget } from '$lib/types/school';
import { listAllEntityPages, listAllEntityPagesByIds, listAllEntityPagesForIdFilters } from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

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
	signal?: AbortSignal,
): Promise<AnnouncementSources> {
	const announcementsRaw = await listAllEntityPages(
		query => client.entities.announcements.list(query),
		{ baseQuery: { schoolId }, signal },
	);
	const announcementIds = announcementsRaw.map(announcement => announcement.id);
	const announcementTargetsRaw = await listAllEntityPagesForIdFilters(
		query => client.entities.announcementTargets.list(query),
		[{ field: 'announcementId', ids: announcementIds }],
		{ signal },
	);

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

export async function fetchAnnouncements(client: SchoolClient, schoolId: string, signal?: AbortSignal): Promise<Announcement[]> {
	const sources = await fetchAnnouncementSources(client, schoolId, signal);
	return mapAnnouncements(sources);
}

export interface AnnouncementPersonRef {
	kind?: string | null;
	id?: string | null;
}

export type AnnouncementPeople = Record<'guardians' | 'students' | 'staff', ReadonlyMap<string, string>>;

export function emptyAnnouncementPeople(): AnnouncementPeople {
	return { guardians: new Map(), students: new Map(), staff: new Map() };
}

/** Resolve authorized person labels for a drawer. Old deliveries may lack a recipient kind. */
export async function fetchAnnouncementPeople(
	client: SchoolClient,
	schoolId: string,
	academicYearId: string | null,
	refs: readonly AnnouncementPersonRef[],
	signal: AbortSignal,
): Promise<AnnouncementPeople> {
	if (!schoolId)
		return emptyAnnouncementPeople();
	const ids = (...kinds: string[]) => refs.flatMap(ref =>
		ref.id && (!ref.kind || kinds.includes(ref.kind)) ? [ref.id] : []);
	const options = { extraQuery: { schoolId }, signal };
	const [guardians, students, staff] = await Promise.all([
		safeOptionalEntityList(() => listAllEntityPagesByIds(query => client.entities.guardians.list(query), ids('guardian'), options)),
		safeOptionalEntityList(() => listAllEntityPagesByIds(query => client.entities.students.list(query), ids('student'), options)),
		academicYearId
			? safeOptionalEntityList(() => listAllEntityPagesByIds(query => client.entities.staffMembers.list(query), ids('staff', 'staff_member', 'teacher'), { ...options, extraQuery: { schoolId, accountKind: 'human' } }))
			: [],
	]);
	signal.throwIfAborted();
	const labels = (rows: { id: string; firstName: string; lastName: string }[]) => new Map(rows.map(row => [row.id, `${row.firstName} ${row.lastName}`]));
	return { guardians: labels(guardians), students: labels(students), staff: labels(staff) };
}

export function deliveryRecipientName(ref: AnnouncementPersonRef, people: AnnouncementPeople): string | undefined {
	if (!ref.id)
		return undefined;
	switch (ref.kind) {
		case 'guardian': return people.guardians.get(ref.id);
		case 'student': return people.students.get(ref.id);
		case 'staff':
		case 'teacher': return people.staff.get(ref.id);
		default: return people.guardians.get(ref.id) ?? people.students.get(ref.id) ?? people.staff.get(ref.id);
	}
}
