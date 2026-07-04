import type { GradeLevel } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

function nextGradeLevelId(name: string): string {
	const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const base = slug ? `gl-${slug}` : `gl-${Date.now().toString(36)}`;
	let id = base;
	let index = 1;
	while (academicContext.gradeLevels.some(level => level.id === id)) {
		id = `${base}-${index}`;
		index += 1;
	}
	return id;
}

export async function saveGradeLevelMutation(
	input: {
		id?: string;
		name: string;
		cycle: string;
		order: number;
	},
	options?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = input.id ?? nextGradeLevelId(input.name);
	const entity = {
		id,
		schoolId: schoolId(),
		name: input.name.trim(),
		cycle: input.cycle.trim() || null,
		order: input.order,
	};

	const result = await runMutation(
		() => client.entities.gradeLevels.save(entity),
		{
			successMessage: options?.successMessage,
			refresh: true,
		},
	);

	return result !== null;
}

export async function deleteGradeLevelMutation(
	gradeLevelId: string,
	options?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.entities.gradeLevels.delete({ id: gradeLevelId }),
		{
			successMessage: options?.successMessage,
			refresh: true,
		},
	);

	return result !== null;
}

export function gradeLevelFromContext(id: string): GradeLevel | undefined {
	return academicContext.gradeLevelById(id);
}
