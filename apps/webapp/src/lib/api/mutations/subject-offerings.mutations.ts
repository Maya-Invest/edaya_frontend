import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function setClassSubjectOfferedMutation(input: {
	classSubjectId: string;
	isOffered: boolean;
	expectedParticipationRevision: number;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.setClassSubjectOffered({
			classSubjectId: input.classSubjectId,
			isOffered: input.isOffered,
			expectedParticipationRevision: input.expectedParticipationRevision,
		}),
		{ successMessage: input.successMessage, versionKeys: ['subjects', 'subjectEnrollments', 'attendance', 'evaluations', 'planning', 'reportCards'] },
	);
	return result !== null;
}

export async function updateSubjectSettingsMutation(input: {
	subjectId: string;
	coefficient?: number;
	isOptional?: boolean;
	expectedParticipationRevisions?: Record<string, number>;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.updateSubject({
			subjectId: input.subjectId,
			coefficient: input.coefficient,
			isOptional: input.isOptional,
			expectedParticipationRevisions: input.expectedParticipationRevisions,
		}),
		{ successMessage: input.successMessage, versionKeys: ['subjects', 'subjectEnrollments', 'attendance', 'evaluations', 'planning', 'reportCards'] },
	);
	return result !== null;
}

export async function removeSubjectMutation(input: {
	subjectId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.removeSubject({
			subjectId: input.subjectId,
		}),
		{ successMessage: input.successMessage, versionKeys: ['subjects', 'subjectEnrollments', 'attendance', 'evaluations', 'planning', 'reportCards'] },
	);
	return result !== null;
}
