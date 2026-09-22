import type { AssessmentKind } from '$lib/types/school';

export type KindCompleteAssessmentTiming
	= | {
		kind: 'homework';
		dueAt: string;
		startsAt: null;
		endsAt: null;
		lessonSessionId: null;
	}
	| {
		kind: Exclude<AssessmentKind, 'homework'>;
		dueAt: null;
		startsAt: string | null;
		endsAt: string | null;
		lessonSessionId: string | null;
	};

export function optionalAssessmentInstant(value: unknown): string | null | undefined {
	if (typeof value === 'string' || value === null || value === undefined) {
		return value;
	}
	return undefined;
}

export function kindCompleteAssessmentTiming(input: {
	kind: AssessmentKind;
	dueAt?: string | null;
	startsAt?: string | null;
	endsAt?: string | null;
	lessonSessionId?: string | null;
}): KindCompleteAssessmentTiming | null {
	if (input.kind === 'homework') {
		const dueAt = input.dueAt?.trim();
		if (!dueAt) {
			return null;
		}
		return {
			kind: 'homework',
			dueAt,
			startsAt: null,
			endsAt: null,
			lessonSessionId: null,
		};
	}

	const lessonSessionId = input.lessonSessionId?.trim() || null;
	const startsAt = input.startsAt?.trim() || null;
	const endsAt = input.endsAt?.trim() || null;
	if (!lessonSessionId && (!startsAt || !endsAt)) {
		return null;
	}
	return {
		kind: input.kind,
		dueAt: null,
		startsAt,
		endsAt,
		lessonSessionId,
	};
}
