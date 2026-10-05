import type { Subject } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { buildSubjectConfigCommand } from '$lib/api/subject-save-payload';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toCanonicalCatalogText } from '$lib/i18n/catalog-label';
import { createSubjectForClass } from '$lib/subjects/create-subject-for-class';
import {
	createSubjectForGradeLevel,
	createSubjectImportIdsForGradeLevel,
} from '$lib/subjects/create-subject-for-grade-level';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function updateSubjectMutation(input: {
	classSubjectId: string;
	name: string;
	categoryId: string;
	color: Subject['color'];
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	let classSubject;
	let subject;
	try {
		classSubject = await client.entities.classSubjects.get(input.classSubjectId);
		subject = await client.entities.subjects.get(classSubject.subjectId);
	}
	catch {
		toast.error(get(t)('dataState.errorDescription'));
		return false;
	}

	const result = await runMutation(() => client.commands.configureSubject(
		buildSubjectConfigCommand(subject, {
			id: subject.id,
			name: toCanonicalCatalogText(input.name),
			categoryId: input.categoryId,
			color: input.color,
		}),
	), { successMessage: input.successMessage, versionKeys: ['subjects', 'planning'] });
	return result !== null;
}

export async function createSubjectForClassMutation(input: {
	classGroupId: string;
	name: string;
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
			categoryId: input.categoryId,
			color: input.color,
			createdAt,
		});
		return classSubjectId;
	}, { successMessage: input.successMessage, versionKeys: ['subjects', 'planning'] });
	return result ? classSubjectId : null;
}

export async function createSubjectForGradeLevelMutation(input: {
	gradeLevelId: string;
	academicYearId: string;
	classGroupIds: string[];
	name: string;
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
	if (input.classGroupIds.length === 0) {
		toast.error(get(t)('subjects.noClassesForGradeLevel'));
		return null;
	}

	const seed = Date.now().toString(36);
	const { subjectId, gradeLevelSubjectId, classSubjectIdsByClassGroupId } = createSubjectImportIdsForGradeLevel(
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
			gradeLevelSubjectId,
			classSubjectIdsByClassGroupId,
			name: toCanonicalCatalogText(input.name),
			categoryId: input.categoryId,
			color: input.color,
			createdAt,
		});
		return Object.values(classSubjectIdsByClassGroupId)[0] ?? gradeLevelSubjectId;
	}, {
		successMessage: input.successMessage,
		versionKeys: ['subjects'],
	});
	return result;
}
