import type { DisciplinaryActionKind } from '$lib/types/discipline';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { disciplineCatalogContext } from '$lib/discipline-catalog/context.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export async function saveDisciplinaryActionMutation(input: {
	id?: string;
	name: string;
	kind: DisciplinaryActionKind;
	severity?: number;
	defaultDurationDays?: number;
	description?: string;
	successMessage?: string;
}): Promise<boolean> {
	const sid = schoolId();
	if (!sid) {
		return false;
	}

	const client = getBrowserSchoolClient();
	const id = input.id ?? `disc-${Date.now().toString(36)}`;
	const entity = {
		id,
		schoolId: sid,
		name: input.name.trim(),
		kind: input.kind,
		severity: input.severity,
		defaultDurationDays: input.defaultDurationDays,
		description: input.description?.trim() || undefined,
	};

	const result = await runMutation(
		() => client.entities.disciplinaryActions.save(entity),
		{
			successMessage: input.successMessage,
			onSuccess: () => {
				disciplineCatalogContext.upsert(entity);
			},
		},
	);
	return result !== null;
}
