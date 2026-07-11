import type { components } from '$lib/api/schema';
import type { PeriodDefinition } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export async function savePeriodDefinitionMutation(input: {
	id?: string;
	academicYearId: string;
	label: string;
	dayOfWeek?: components['schemas']['PeriodDefinition']['dayOfWeek'];
	order: number;
	startTime: string;
	endTime: string;
	isBreak: boolean;
	isTeachingSlot?: boolean;
	successMessage?: string;
}): Promise<boolean> {
	const sid = schoolId();
	if (!sid) {
		return false;
	}

	const client = getBrowserSchoolClient();
	const id = input.id ?? `pd-${input.academicYearId}-${Date.now().toString(36)}`;
	const entity: PeriodDefinition = {
		id,
		schoolId: sid,
		academicYearId: input.academicYearId,
		label: input.label.trim(),
		order: input.order,
		startTime: input.startTime,
		endTime: input.endTime,
		isBreak: input.isBreak,
	};

	const { schoolId: _schoolId, ...command } = entity;
	const result = await runMutation(
		() => client.commands.configurePeriodDefinition({
			...command,
			dayOfWeek: input.dayOfWeek ?? 'monday',
			isTeachingSlot: input.isTeachingSlot ?? !input.isBreak,
		}),
		{
			successMessage: input.successMessage,
			onSuccess: () => {
				academicContext.upsertPeriodDefinition(entity);
			},
		},
	);
	return result !== null;
}
