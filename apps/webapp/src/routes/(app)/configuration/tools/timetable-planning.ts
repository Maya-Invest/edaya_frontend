import type {
	GenerateClassInput,
	GenerateClassResult,
	GenerateSchoolResult,
} from '$lib/api/mutations/timetable-generation.mutations';
import type { TimetablePlacementParameters } from '$lib/scheduling/timetable-placement-parameters';
import type { ClassNode, GradeLevel } from '$lib/types/school';

export function sortTimetableClasses(classes: ClassNode[], gradeLevels: GradeLevel[]): ClassNode[] {
	const gradeOrder = (gradeLevelId: string) => {
		return gradeLevels.find(level => level.id === gradeLevelId)?.order ?? Number.MAX_SAFE_INTEGER;
	};
	return [...classes].sort((left, right) => {
		const levelDifference = gradeOrder(left.gradeLevelId) - gradeOrder(right.gradeLevelId);
		return levelDifference || left.name.localeCompare(right.name);
	});
}

function filterPlacementMap(
	map: Record<string, number> | undefined,
	classSubjectIds: Set<string>,
): Record<string, number> | undefined {
	if (!map) {
		return undefined;
	}
	const filtered: Record<string, number> = {};
	for (const [id, value] of Object.entries(map)) {
		if (classSubjectIds.has(id)) {
			filtered[id] = value;
		}
	}
	return Object.keys(filtered).length > 0 ? filtered : undefined;
}

export function scopePlacementParametersForClass(
	params: TimetablePlacementParameters | undefined,
	classSubjectIds: Set<string>,
): TimetablePlacementParameters | undefined {
	if (!params) {
		return undefined;
	}
	const scoped: TimetablePlacementParameters = {};
	const periodsPerWeekByClassSubjectId = filterPlacementMap(
		params.periodsPerWeekByClassSubjectId,
		classSubjectIds,
	);
	const minPeriodSpanByClassSubjectId = filterPlacementMap(
		params.minPeriodSpanByClassSubjectId,
		classSubjectIds,
	);
	const maxPeriodSpanByClassSubjectId = filterPlacementMap(
		params.maxPeriodSpanByClassSubjectId,
		classSubjectIds,
	);
	if (periodsPerWeekByClassSubjectId) {
		scoped.periodsPerWeekByClassSubjectId = periodsPerWeekByClassSubjectId;
	}
	if (minPeriodSpanByClassSubjectId) {
		scoped.minPeriodSpanByClassSubjectId = minPeriodSpanByClassSubjectId;
	}
	if (maxPeriodSpanByClassSubjectId) {
		scoped.maxPeriodSpanByClassSubjectId = maxPeriodSpanByClassSubjectId;
	}
	return Object.keys(scoped).length > 0 ? scoped : undefined;
}

export interface TimetableGenerationProgress {
	current: number;
	total: number;
	classGroupId: string;
	className: string;
}

export class SequentialTimetableGenerationError extends Error {
	override cause: unknown;
	completed: GenerateClassResult[];
	failedClass: { id: string; name: string };
	total: number;

	constructor(input: {
		cause: unknown;
		completed: GenerateClassResult[];
		failedClass: { id: string; name: string };
		total: number;
	}) {
		const message = input.cause instanceof Error
			? input.cause.message
			: 'Sequential timetable generation failed';
		super(message, { cause: input.cause });
		this.name = 'SequentialTimetableGenerationError';
		this.cause = input.cause;
		this.completed = input.completed;
		this.failedClass = input.failedClass;
		this.total = input.total;
	}
}

export async function generateSchoolTimetableSequentially(input: {
	academicYearId: string;
	startDate: string;
	endDate: string;
	options?: GenerateClassInput['options'];
	placementParameters?: TimetablePlacementParameters;
	classes: Array<{ id: string; name: string }>;
	classSubjects: Array<{ id: string; classGroupId: string }>;
	generateClass: (command: GenerateClassInput) => Promise<GenerateClassResult>;
	onProgress?: (progress: TimetableGenerationProgress) => void;
}): Promise<GenerateSchoolResult> {
	const completed: GenerateClassResult[] = [];
	const total = input.classes.length;

	for (let index = 0; index < input.classes.length; index++) {
		const classGroup = input.classes[index]!;
		input.onProgress?.({
			current: index + 1,
			total,
			classGroupId: classGroup.id,
			className: classGroup.name,
		});

		const classSubjectIds = new Set(
			input.classSubjects
				.filter(subject => subject.classGroupId === classGroup.id)
				.map(subject => subject.id),
		);
		const placementParameters = scopePlacementParametersForClass(
			input.placementParameters,
			classSubjectIds,
		);

		try {
			const result = await input.generateClass({
				classGroupId: classGroup.id,
				academicYearId: input.academicYearId,
				startDate: input.startDate,
				endDate: input.endDate,
				options: input.options,
				placementParameters,
			});
			completed.push(result);
		}
		catch (cause) {
			throw new SequentialTimetableGenerationError({
				cause,
				completed,
				failedClass: { id: classGroup.id, name: classGroup.name },
				total,
			});
		}
	}

	return {
		academicYearId: input.academicYearId,
		classGroups: completed,
		skippedClassGroupIds: [],
	};
}
