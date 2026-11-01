import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

export async function deletePeriodDefinitionMutation(
	periodDefinitionId: string,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.entities.periodDefinitions.delete({ id: periodDefinitionId }),
		{
			versionKeys: ['periodDefinitions', 'planning'],
			successMessage: opts?.successMessage,
			onSuccess: () => {
				academicContext.removePeriodDefinition(periodDefinitionId);
			},
		},
	);
	return result !== null;
}
