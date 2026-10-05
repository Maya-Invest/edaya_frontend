import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

function parseOptionalPositiveInt(value: string): number | null | undefined {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}
	const parsed = Number(trimmed);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return undefined;
	}
	return parsed;
}

export async function updateClassSubjectTimetableMutation(input: {
	classSubjectId: string;
	periodsPerWeek: string;
	minPeriodSpan: string;
	maxPeriodSpan: string;
	successMessage?: string;
}): Promise<boolean> {
	const periodsPerWeek = parseOptionalPositiveInt(input.periodsPerWeek);
	const minPeriodSpan = parseOptionalPositiveInt(input.minPeriodSpan);
	const maxPeriodSpan = parseOptionalPositiveInt(input.maxPeriodSpan);
	if (periodsPerWeek === undefined || minPeriodSpan === undefined || maxPeriodSpan === undefined) {
		toast.error(get(t)('timetable.periodSpanInvalid'));
		return false;
	}
	if (maxPeriodSpan !== null && minPeriodSpan !== null && maxPeriodSpan < minPeriodSpan) {
		toast.error(get(t)('timetable.periodSpanRangeInvalid'));
		return false;
	}

	const payload: components['schemas']['ConfigureClassSubjectTimetableCommand'] = {
		classSubjectId: input.classSubjectId,
		periodsPerWeek,
		minPeriodSpan,
		maxPeriodSpan,
	};

	const client = getBrowserSchoolClient();
	const result = await runMutation(
		() => client.commands.configureClassSubjectTimetable(payload),
		{ successMessage: input.successMessage, versionKeys: ['subjects', 'planning'] },
	);
	return result !== null;
}
