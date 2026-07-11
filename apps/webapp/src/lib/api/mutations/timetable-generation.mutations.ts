import type { components } from '$lib/api/schema';
import type {
	GenerateClassInput,
	GenerateSchoolInput,
	PublishInput,
	RepublishInput,
} from './timetable-generation.client';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { timetableGenerationMutations } from './timetable-generation.client';

export type { GenerateClassResult, GenerateSchoolResult } from './timetable-generation.client';

function browserMutations() {
	return timetableGenerationMutations(getBrowserSchoolClient());
}

export function generateClassTimetable(input: GenerateClassInput) {
	return browserMutations().generateClassTimetable(input);
}

export function generateSchoolTimetable(input: GenerateSchoolInput) {
	return browserMutations().generateSchoolTimetable(input);
}

export function publishClassTimetable(input: PublishInput) {
	return browserMutations().publishClassTimetable(input);
}

export function republishClassTimetable(input: RepublishInput) {
	return browserMutations().republishClassTimetable(input);
}

export function resolveClassTimetableSpace(input: components['schemas']['ResolveTimetableSpaceQuery']) {
	return browserMutations().resolveClassTimetableSpace(input);
}
