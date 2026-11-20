import type { ClassNode, GradeLevel, HierarchyGroup } from '$lib/types/school';
import { sortGradeLevels } from '$lib/academic/grade-level-sort';

/** Regroupe les classes par cycle, ordonnées selon les niveaux (Collège puis Lycée). */
export function buildClassHierarchy(
	classList: ClassNode[],
	gradeLevelList: GradeLevel[],
): HierarchyGroup[] {
	const sortedLevels = sortGradeLevels(gradeLevelList);
	const cycles: string[] = [];
	for (const gl of sortedLevels) {
		if (!cycles.includes(gl.cycle)) {
			cycles.push(gl.cycle);
		}
	}
	return cycles.map(cycle => ({
		level: cycle,
		classes: sortedLevels
			.filter(gl => gl.cycle === cycle)
			.flatMap(gl => classList.filter(c => c.gradeLevelId === gl.id)),
	}));
}
