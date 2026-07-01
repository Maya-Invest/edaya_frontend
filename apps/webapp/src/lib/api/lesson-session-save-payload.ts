import type { components } from '$lib/api/schema';

type LessonSessionEntity = components['schemas']['LessonSession'];

export function buildLessonSessionSavePayload(
	existing: LessonSessionEntity,
	updates: {
		displayLabel: string;
		classSubjectId?: string | null;
		sessionNote?: string | null;
	},
): LessonSessionEntity {
	return {
		...existing,
		displayLabel: updates.displayLabel.trim(),
		classSubjectId: updates.classSubjectId ?? existing.classSubjectId,
		...(updates.sessionNote !== undefined ? { sessionNote: updates.sessionNote } : {}),
	};
}
