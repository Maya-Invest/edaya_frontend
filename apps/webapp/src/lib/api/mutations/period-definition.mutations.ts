import type { PeriodDefinition, PeriodDefinitionDayOfWeek } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';

function schoolId(): string {
	return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}

export interface PeriodDefinitionSaveInput {
	id?: string;
	academicYearId: string;
	label: string;
	dayOfWeek: PeriodDefinitionDayOfWeek;
	order: number;
	startTime: string;
	endTime: string;
	isBreak: boolean;
	isTeachingSlot: boolean;
	successMessage?: string;
}

function toEntity(input: PeriodDefinitionSaveInput, sid: string, id: string): PeriodDefinition {
	return {
		id,
		schoolId: sid,
		academicYearId: input.academicYearId,
		label: input.label.trim(),
		dayOfWeek: input.dayOfWeek,
		order: input.order,
		startTime: input.startTime,
		endTime: input.endTime,
		isBreak: input.isBreak,
		isTeachingSlot: input.isTeachingSlot,
	};
}

export async function savePeriodDefinitionMutation(input: PeriodDefinitionSaveInput): Promise<boolean> {
	const sid = schoolId();
	if (!sid) {
		return false;
	}

	const client = getBrowserSchoolClient();
	const id = input.id ?? `pd-${input.academicYearId}-${Date.now().toString(36)}`;
	const entity = toEntity(input, sid, id);

	const { schoolId: _schoolId, ...command } = entity;
	const result = await runMutation(
		() => client.commands.configurePeriodDefinition(command),
		{
			successMessage: input.successMessage,
			onSuccess: () => {
				academicContext.upsertPeriodDefinition(entity);
			},
		},
	);
	return result !== null;
}

export async function savePeriodDefinitionsBatchMutation(input: {
	definitions: Array<Omit<PeriodDefinitionSaveInput, 'successMessage'>>;
	successMessage?: string;
}): Promise<boolean> {
	const sid = schoolId();
	if (!sid || input.definitions.length === 0) {
		return false;
	}

	const client = getBrowserSchoolClient();
	const nonce = Date.now().toString(36);
	const entities = input.definitions.map((definition, index) => {
		const id = definition.id
			?? `pd-${definition.academicYearId}-${definition.dayOfWeek}-${definition.order}-${nonce}-${index}`;
		return toEntity(definition, sid, id);
	});

	const result = await runMutation(
		async () => {
			for (const entity of entities) {
				const { schoolId: _schoolId, ...command } = entity;
				await client.commands.configurePeriodDefinition(command);
			}
			return entities;
		},
		{
			successMessage: input.successMessage,
			onSuccess: (created) => {
				for (const entity of created) {
					academicContext.upsertPeriodDefinition(entity);
				}
			},
		},
	);
	return result !== null;
}
