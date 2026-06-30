import type { Subject, SubjectCategory } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { buildSubjectSavePayload } from '$lib/api/subject-save-payload';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export async function updateSubjectMutation(input: {
	classSubjectId: string;
	name: string;
	category: SubjectCategory;
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

	const result = await runMutation(() => client.entities.subjects.save(
		buildSubjectSavePayload(subject, {
			name: input.name,
			category: input.category,
			color: input.color,
		}),
	), { successMessage: input.successMessage });
	return result !== null;
}

export async function createSubjectForClassMutation(input: {
	classGroupId: string;
	name: string;
	category: SubjectCategory;
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

	const result = await runMutation(async () => {
		await client.entities.subjects.save({
			id: subjectId,
			schoolId,
			name: input.name.trim(),
			category: input.category,
			color: input.color,
			createdAt: new Date().toISOString(),
		});
		return client.commands.offerSubjectToClass({
			id: classSubjectId,
			classGroupId: input.classGroupId,
			subjectId,
			createdAt: new Date().toISOString(),
		});
	}, { successMessage: input.successMessage });
	return result ? classSubjectId : null;
}
