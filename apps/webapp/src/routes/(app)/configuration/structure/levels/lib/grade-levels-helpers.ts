export interface GradeLevelsPageSlice {
	levelCount: number;
}

export function emptyGradeLevelsSlice(): GradeLevelsPageSlice {
	return {
		levelCount: 0,
	};
}

export function gradeLevelIdFromUrl(url: URL): string | undefined {
	return url.searchParams.get('gradeLevel') ?? undefined;
}

/** Editing and confirmation retain one draft only within the same level and scope. */
export function retainsGradeLevelDraft(current: URL, destination: URL): boolean {
	const modal = current.searchParams.get('modal');
	if (current.origin !== destination.origin || current.pathname !== destination.pathname
		|| !['create-level', 'edit-level'].includes(modal ?? '')
		|| destination.searchParams.get('modal') !== modal
		|| ![null, 'confirm'].includes(destination.searchParams.get('modalStep'))) {
		return false;
	}
	const source = new URL(current);
	const target = new URL(destination);
	for (const url of [source, target]) {
		url.searchParams.delete('modalStep');
		url.searchParams.sort();
	}
	return source.search === target.search;
}
