import type { UpdateSubjectInput } from '$lib/subjects/update-subject';
import type { Subject } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toCanonicalCatalogText } from '$lib/i18n/catalog-label';
import { createSubjectForClass } from '$lib/subjects/create-subject-for-class';
import {
	createSubjectForGradeLevel,
	createSubjectImportIdsForGradeLevel,
} from '$lib/subjects/create-subject-for-grade-level';
import { updateSubject } from '$lib/subjects/update-subject';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function updateSubjectMutation(input: UpdateSubjectInput & { successMessage?: string }): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(() => updateSubject(client, {
		...input,
		name: toCanonicalCatalogText(input.name),
	}), { successMessage: input.successMessage, versionKeys: ['subjects', 'planning', 'reportCards'] });
	return result !== null;
}

export async function createSubjectForClassMutation(input: {
	classGroupId: string;
	name: string;
	disciplineId?: string | null;
	code?: string | null;
	coefficient?: number | null;
	reportModuleId?: string | null;
	expectedReportConfigurationRevision?: number;
	shortName?: string | null;
	isOptional?: boolean;

	categoryId: string;
	color: Subject['color'];
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		toast.error(get(t)('subjects.noSchool'));
		return null;
	}

	const subjectId = `subj-${Date.now().toString(36)}`;
	const classSubjectId = `cs-${input.classGroupId}-${subjectId.slice(-6)}`;
	const createdAt = new Date().toISOString();

	const result = await runMutation(async () => {
		await createSubjectForClass(client, {
			schoolId,
			classGroupId: input.classGroupId,
			subjectId,
			classSubjectId,
			name: toCanonicalCatalogText(input.name),
			disciplineId: input.disciplineId,
			code: input.code ?? undefined,
			coefficient: input.coefficient ?? undefined,
			shortName: input.shortName ?? undefined,
			isOptional: input.isOptional,
			categoryId: input.categoryId,
			color: input.color,
			createdAt,
		});
		return classSubjectId;
	}, { successMessage: input.successMessage, versionKeys: ['subjects', 'planning', 'reportCards'] });
	return result ? classSubjectId : null;
}

export async function createSubjectForGradeLevelMutation(input: {
	gradeLevelId: string;
	academicYearId: string;
	classGroupIds: string[];
	name: string;
	disciplineId?: string | null;
	code?: string | null;
	coefficient?: number | null;
	reportModuleId?: string | null;
	expectedReportConfigurationRevision?: number;
	shortName?: string | null;
	isOptional?: boolean;

	categoryId: string;
	color: Subject['color'];
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	if (!schoolId) {
		toast.error(get(t)('subjects.noSchool'));
		return null;
	}
	if (!input.academicYearId) {
		toast.error(get(t)('subjects.noAcademicYear'));
		return null;
	}

	const seed = Date.now().toString(36);
	const { subjectId, classSubjectIdsByClassGroupId } = createSubjectImportIdsForGradeLevel(
		0,
		input.gradeLevelId,
		input.classGroupIds,
		seed,
	);
	const createdAt = new Date().toISOString();

	const result = await runMutation(async () => {
		await createSubjectForGradeLevel(client, {
			schoolId,
			academicYearId: input.academicYearId,
			gradeLevelId: input.gradeLevelId,
			subjectId,
			classSubjectIdsByClassGroupId,
			name: toCanonicalCatalogText(input.name),
			reportModuleId: input.reportModuleId,
			expectedReportConfigurationRevision: input.expectedReportConfigurationRevision,
			disciplineId: input.disciplineId,
			code: input.code ?? undefined,
			coefficient: input.coefficient ?? undefined,
			shortName: input.shortName ?? undefined,
			isOptional: input.isOptional,
			categoryId: input.categoryId,
			color: input.color,
			createdAt,
		});
		return subjectId;
	}, {
		successMessage: input.successMessage,
		versionKeys: ['subjects', 'reportCards'],
	});
	return result;
}
