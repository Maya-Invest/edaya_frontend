import type { ClassNode, GradeLevel, Subject } from '$lib/types/school';

export interface SubjectLevelGroup {
	key: string;
	label: string;
	subtitle: string;
	count: number;
	items: Subject[];
}

export function groupSubjectsByGradeLevel(
	subjects: readonly Subject[],
	classes: readonly ClassNode[],
	gradeLevels: readonly GradeLevel[],
): SubjectLevelGroup[] {
	const classById = Object.fromEntries(classes.map(cls => [cls.id, cls]));
	const gradeLevelById = Object.fromEntries(gradeLevels.map(level => [level.id, level]));
	const byGradeLevelId: Record<string, { subtitle: string; items: Subject[] }> = {};

	for (const subject of subjects) {
		const cls = classById[subject.classId];
		if (!cls) {
			continue;
		}
		const gradeLevelId = cls.gradeLevelId;
		if (!byGradeLevelId[gradeLevelId]) {
			const gradeLevel = gradeLevelById[gradeLevelId];
			byGradeLevelId[gradeLevelId] = {
				subtitle: gradeLevel?.cycle ?? cls.level,
				items: [],
			};
		}
		byGradeLevelId[gradeLevelId].items.push(subject);
	}

	return [...gradeLevels]
		.sort((left, right) => left.order - right.order)
		.filter(level => (byGradeLevelId[level.id]?.items.length ?? 0) > 0)
		.map(level => ({
			key: level.id,
			label: level.name,
			subtitle: byGradeLevelId[level.id]!.subtitle,
			count: byGradeLevelId[level.id]!.items.length,
			items: byGradeLevelId[level.id]!.items,
		}));
}

export function findSubjectLevelGroup(
	label: string,
	subjects: readonly Subject[],
	classes: readonly ClassNode[],
	gradeLevels: readonly GradeLevel[],
): Omit<SubjectLevelGroup, 'key' | 'count'> | null {
	const group = groupSubjectsByGradeLevel(subjects, classes, gradeLevels)
		.find(entry => entry.label === label);
	if (!group) {
		return null;
	}
	return {
		label: group.label,
		subtitle: group.subtitle,
		items: group.items,
	};
}
