import type { GradeLevel } from '$lib/types/school';

const SUBJECTS_LIST_PATH = '/configuration/subjects';

function decodeLegacyLevel(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}
	try {
		return decodeURIComponent(value);
	}
	catch {
		return value;
	}
}

export function resolveLegacySubjectGradeLevelId(
	level: string | undefined,
	gradeLevels: readonly Pick<GradeLevel, 'id' | 'name'>[],
): string | undefined {
	const decoded = decodeLegacyLevel(level);
	if (!decoded) {
		return undefined;
	}
	return gradeLevels.find(entry => entry.id === decoded || entry.name === decoded)?.id;
}

export function subjectLevelCompatibilityHref(
	url: URL,
	level: string | undefined,
	gradeLevels: readonly Pick<GradeLevel, 'id' | 'name'>[],
): string {
	const next = new URL(SUBJECTS_LIST_PATH, url.origin);
	const query = url.searchParams.get('q')?.trim();
	if (query) {
		next.searchParams.set('q', query);
	}
	const gradeLevelId = resolveLegacySubjectGradeLevelId(level, gradeLevels);
	if (gradeLevelId) {
		next.searchParams.set('gradeLevel', gradeLevelId);
	}
	return `${next.pathname}${next.search}`;
}
