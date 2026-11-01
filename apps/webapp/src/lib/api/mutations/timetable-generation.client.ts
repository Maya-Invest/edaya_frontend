import type { components } from '$lib/api/schema';
import { formatDateInput } from '$lib/date/format';

export type GenerateClassInput = components['schemas']['GenerateClassGroupTimetableCommand'];
export type GenerateClassResult = components['schemas']['GenerateClassGroupTimetableResponse'];
export type GenerateSchoolInput = components['schemas']['GenerateSchoolTimetableCommand'];
export type GenerateSchoolResult = components['schemas']['GenerateSchoolTimetableResponse'];

export interface TimetableGeneratedClient {
	commands: {
		generateClassGroupTimetable: (input: GenerateClassInput) => Promise<GenerateClassResult>;
		generateSchoolTimetable: (input: GenerateSchoolInput) => Promise<GenerateSchoolResult>;
	};
	queries: {
		resolveTimetableSpace: (input: components['schemas']['ResolveTimetableSpaceQuery']) => Promise<components['schemas']['ResolvedTimetableCell'][]>;
	};
}

function withApiDateRange<T extends { startDate: string | null; endDate: string | null }>(input: T): T {
	return {
		...input,
		startDate: formatDateInput(input.startDate),
		endDate: formatDateInput(input.endDate),
	} as T;
}

export function timetableGenerationMutations(client: TimetableGeneratedClient) {
	return {
		generateClassTimetable: (input: GenerateClassInput) => client.commands.generateClassGroupTimetable(withApiDateRange(input)),
		generateSchoolTimetable: (input: GenerateSchoolInput) => client.commands.generateSchoolTimetable(withApiDateRange(input)),
		resolveClassTimetableSpace: (input: components['schemas']['ResolveTimetableSpaceQuery']) => client.queries.resolveTimetableSpace(withApiDateRange(input)),
	};
}
