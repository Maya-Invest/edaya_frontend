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
		return levelDifference || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
	});
}

export function selectedTimetableClasses<T extends { id: string }>(classes: T[], classGroupIds: string[]): T[] {
	const ids = new Set(classGroupIds);
	if (!ids.size || classGroupIds.some(id => !classes.some(row => row.id === id))) {
		throw new Error('timetable.invalidClassSelection');
	}
	return classes.filter(row => ids.has(row.id)).map(row => ({ ...row }));
}

export function timetableClassGroups(classes: ClassNode[], gradeLevels: GradeLevel[], search: string) {
	const query = search.trim().toLocaleLowerCase();
	const grades = new Map(gradeLevels.map(grade => [grade.id, grade]));
	const groups = new Map<string, { id: string; label: string; classes: ClassNode[] }>();
	for (const row of sortTimetableClasses(classes, gradeLevels)) {
		const label = grades.get(row.gradeLevelId)?.label || grades.get(row.gradeLevelId)?.name || '';
		if (query && !`${row.name} ${label}`.toLocaleLowerCase().includes(query))
			continue;
		const group = groups.get(row.gradeLevelId) ?? { id: row.gradeLevelId, label, classes: [] };
		group.classes.push(row);
		groups.set(row.gradeLevelId, group);
	}
	return [...groups.values()];
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
	// Snapshot the run so edits or refreshes cannot change the remaining work.
	const classes = input.classes.map(row => ({ ...row }));
	const subjectIdsByClass = new Map<string, Set<string>>();
	for (const subject of input.classSubjects) {
		const ids = subjectIdsByClass.get(subject.classGroupId) ?? new Set<string>();
		ids.add(subject.id);
		subjectIdsByClass.set(subject.classGroupId, ids);
	}

	for (let index = 0; index < classes.length; index++) {
		const classGroup = classes[index]!;
		input.onProgress?.({
			current: index + 1,
			total,
			classGroupId: classGroup.id,
			className: classGroup.name,
		});

		const classSubjectIds = subjectIdsByClass.get(classGroup.id) ?? new Set<string>();
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
