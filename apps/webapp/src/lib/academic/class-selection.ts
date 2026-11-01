import type { ClassNode } from '$lib/types/school';

/** Picks the route class id when valid, otherwise the first class in the active year. */
export function resolveActiveClassId(
	pageClassId: string | undefined,
	classes: ClassNode[],
): string {
	if (pageClassId && (classes.length === 0 || classes.some(entry => entry.id === pageClassId))) {
		return pageClassId;
	}
	return classes[0]?.id ?? '';
}

export function classLabelForId(classId: string, classes: ClassNode[]): string {
	return classes.find(entry => entry.id === classId)?.name ?? '';
}
