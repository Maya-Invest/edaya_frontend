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
