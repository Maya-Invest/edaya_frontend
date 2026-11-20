import type { components } from '$lib/api/schema';
import type { Subject } from '$lib/types/school';

type SubjectEntity = components['schemas']['Subject'];
type SubjectConfigCommand = components['schemas']['SubjectConfigCommand'];

/** Build a save payload that passes API OpenAPI validation (positive coefficient). */
export function buildSubjectSavePayload(
	existing: SubjectEntity,
	updates: { name: string; shortName?: string | null; categoryId: string; color: Subject['color'] },
): SubjectEntity {
	const payload: SubjectEntity = {
		...existing,
		id: existing.id,
		schoolId: existing.schoolId,
		name: updates.name.trim(),
		categoryId: updates.categoryId,
		color: updates.color,
	};

	delete payload.coefficient;

	if (
		typeof existing.coefficient === 'number'
		&& Number.isFinite(existing.coefficient)
		&& existing.coefficient > 0
	) {
		payload.coefficient = existing.coefficient;
	}

	if (existing.createdAt !== undefined && existing.createdAt !== null) {
		payload.createdAt = existing.createdAt;
	}

	if ('shortName' in updates)
		payload.shortName = updates.shortName?.trim() ?? '';
	return payload;
}

export function buildSubjectConfigCommand(
	existing: SubjectEntity,
	updates: {
		id: string;
		name: string;
		categoryId: string;
		color: Subject['color'];
		createdAt?: string;
		coefficient?: number | null;
		disciplineId?: string | null;
		shortName?: string | null;
		isOptional?: boolean;
	},
): SubjectConfigCommand {
	const payload: SubjectConfigCommand = {
		...existing,
		id: updates.id,
		name: updates.name.trim(),
		categoryId: updates.categoryId,
		color: updates.color,
	};

	if (updates.disciplineId !== undefined)
		payload.disciplineId = updates.disciplineId;
	if (updates.isOptional !== undefined)
		payload.isOptional = updates.isOptional;
	if (updates.coefficient !== undefined)
		payload.coefficient = updates.coefficient;
	const createdAt = updates.createdAt ?? existing?.createdAt;
	if (createdAt !== undefined && createdAt !== null) {
		payload.createdAt = createdAt;
	}

	if ('shortName' in updates)
		payload.shortName = updates.shortName?.trim() ?? '';
	return payload;
}
