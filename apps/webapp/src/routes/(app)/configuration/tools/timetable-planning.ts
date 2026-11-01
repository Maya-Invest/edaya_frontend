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

/** Keep the displayed class stable; after exclusion, advance through the complete list. */
export function activeTimetableClassId(classes: readonly { id: string }[], includedIds: readonly string[], activeId: string): string {
	const included = new Set(includedIds);
	const index = classes.findIndex(row => row.id === activeId);
	if (index >= 0 && included.has(activeId))
		return activeId;
	for (let offset = 1; offset <= classes.length; offset++) {
		const candidate = classes[(index + offset) % classes.length]!;
		if (included.has(candidate.id))
			return candidate.id;
	}
	return '';
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
