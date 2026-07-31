import { parseSemicolonList } from '$lib/import/shared/parse-semicolon-list';

export function parseTeacherSubjectNames(value?: string): string[] {
	return parseSemicolonList(value);
}
