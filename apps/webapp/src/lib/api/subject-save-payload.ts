import type { components } from '$lib/api/schema';
import type { Subject, SubjectCategory } from '$lib/types/school';

type SubjectEntity = components['schemas']['Subject'];
type SubjectConfigCommand = components['schemas']['SubjectConfigCommand'];

/** Build a save payload that passes API OpenAPI validation (no blank code, positive coefficient). */
export function buildSubjectSavePayload(
	existing: SubjectEntity,
	updates: { name: string; category: SubjectCategory; color: Subject['color'] },
): SubjectEntity {
	const payload: SubjectEntity = {
		id: existing.id,
		schoolId: existing.schoolId,
		name: updates.name.trim(),
		category: updates.category,
		color: updates.color,
	};

	const code = typeof existing.code === 'string' ? existing.code.trim() : '';
	if (code.length > 0) {
		payload.code = code;
	}

	if (
		typeof existing.defaultCoefficient === 'number'
		&& Number.isFinite(existing.defaultCoefficient)
		&& existing.defaultCoefficient > 0
	) {
		payload.defaultCoefficient = existing.defaultCoefficient;
	}

	if (existing.createdAt !== undefined && existing.createdAt !== null) {
		payload.createdAt = existing.createdAt;
	}

	return payload;
}

export function buildSubjectConfigCommand(
	existing: SubjectEntity | null,
	updates: {
		id: string;
		name: string;
		category: SubjectCategory;
		color: Subject['color'];
		createdAt?: string;
	},
): SubjectConfigCommand {
	const payload: SubjectConfigCommand = {
		id: updates.id,
		name: updates.name.trim(),
		category: updates.category,
		color: updates.color,
	};

	const code = typeof existing?.code === 'string' ? existing.code.trim() : '';
	if (code.length > 0) {
		payload.code = code;
	}

	const shortName = typeof existing?.shortName === 'string' ? existing.shortName.trim() : '';
	if (shortName.length > 0) {
		payload.shortName = shortName;
	}

	if (
		typeof existing?.defaultCoefficient === 'number'
		&& Number.isFinite(existing.defaultCoefficient)
		&& existing.defaultCoefficient > 0
	) {
		payload.defaultCoefficient = existing.defaultCoefficient;
	}

	const createdAt = updates.createdAt ?? existing?.createdAt;
	if (createdAt !== undefined && createdAt !== null) {
		payload.createdAt = createdAt;
	}

	return payload;
}
