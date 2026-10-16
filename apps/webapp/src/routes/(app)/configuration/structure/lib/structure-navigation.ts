export type StructureTab = 'details' | 'subjects' | 'classes';
export const STRUCTURE_PATH = '/configuration/structure';

export function structureTab(pathname: string): StructureTab {
	if (pathname.startsWith(`${STRUCTURE_PATH}/classes`))
		return 'classes';
	return pathname.startsWith(`${STRUCTURE_PATH}/subjects`) ? 'subjects' : 'details';
}

export function selectedStructureLevel<T extends { id: string }>(levels: readonly T[], requested: string | null): T | undefined {
	return levels.find(level => level.id === requested) ?? levels[0];
}

/** Changing scope closes detail/modal surfaces and resets collection search. */
export function structureHref(url: URL, levelId: string, tab = structureTab(url.pathname)): string {
	const params = new URLSearchParams(url.search);
	for (const key of ['q', 'modal', 'modalTarget', 'modalStep', 'modalTab', 'tab', 'cycle']) {
		params.delete(key);
	}
	params.set('gradeLevel', levelId);
	return `${STRUCTURE_PATH}/${tab}?${params}`;
}

export function legacyStructureHref(url: URL): string {
	const params = new URLSearchParams(url.search);
	const [, kind, rest = ''] = url.pathname.match(/^\/configuration\/(subjects|classes|grade-levels)(?:\/(.*))?$/) ?? [];
	if (kind === 'grade-levels') {
		if (rest)
			params.set('gradeLevel', decodeURIComponent(rest.split('/')[0]));
		const modal = params.get('modal');
		const mapped = { create: 'create-level', edit: 'edit-level', delete: 'delete-level', grading: 'level-grading' }[modal ?? ''];
		if (mapped)
			params.set('modal', mapped);
		return `${STRUCTURE_PATH}/details${params.size ? `?${params}` : ''}`;
	}
	return `${STRUCTURE_PATH}/${kind ?? 'subjects'}${rest ? `/${rest}` : ''}${params.size ? `?${params}` : ''}`;
}
