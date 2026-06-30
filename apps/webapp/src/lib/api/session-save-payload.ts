import type { components } from '$lib/api/schema';

type SessionEntity = components['schemas']['Session'];

/** Build a save payload that passes API OpenAPI validation (no stray spread fields). */
export function buildSessionSavePayload(
	existing: SessionEntity,
	updates: {
		title: string;
		classSubjectId: string | null | undefined;
		startsAt: string;
		endsAt: string;
	},
): SessionEntity {
	const payload: SessionEntity = {
		id: existing.id,
		classGroupId: existing.classGroupId,
		title: updates.title.trim(),
		kind: existing.kind,
		startsAt: updates.startsAt,
		endsAt: updates.endsAt,
		classSubjectId: updates.classSubjectId ?? null,
	};

	if (existing.scheduleId) {
		payload.scheduleId = existing.scheduleId;
	}

	if (existing.createdAt !== undefined && existing.createdAt !== null) {
		payload.createdAt = existing.createdAt;
	}

	return payload;
}
