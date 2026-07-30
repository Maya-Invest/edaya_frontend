import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function setClassSubjectOfferedMutation(input: {
	classSubjectId: string;
	isOffered: boolean;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.setClassSubjectOffered({
			classSubjectId: input.classSubjectId,
			isOffered: input.isOffered,
		}),
		{ successMessage: input.successMessage },
	);
	return result !== null;
}

export async function updateGradeLevelSubjectMutation(input: {
	gradeLevelSubjectId: string;
	coefficient?: number;
	isOptional?: boolean;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.updateGradeLevelSubject({
			gradeLevelSubjectId: input.gradeLevelSubjectId,
			coefficient: input.coefficient,
			isOptional: input.isOptional,
		}),
		{ successMessage: input.successMessage },
	);
	return result !== null;
}

export async function removeSubjectFromGradeLevelMutation(input: {
	gradeLevelSubjectId: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.removeSubjectFromGradeLevel({
			gradeLevelSubjectId: input.gradeLevelSubjectId,
		}),
		{ successMessage: input.successMessage },
	);
	return result !== null;
}
