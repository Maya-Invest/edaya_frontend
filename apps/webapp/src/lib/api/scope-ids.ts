/** Client-side helpers aligned with backend scopeIds grammar (§3.4). */

import type { PermissionCatalogEntry } from '$lib/api/staff-permission-assignments-data';

export type ScopeGrain = Exclude<NonNullable<PermissionCatalogEntry['scope']>, 'platform'>;

export interface ClassSubjectScopeSelection {
	classGroupId: string;
	classSubjectId?: string;
	wildcard?: boolean;
}

export function composeClassGroupScopeIds(classGroupIds: readonly string[]): string {
	const ids = [...new Set(classGroupIds.map(id => id.trim()).filter(Boolean))];
	return ids.join(',');
}

export function composeGradeLevelScopeIds(gradeLevelId: string): string {
	return gradeLevelId.trim();
}

export function composeClassSubjectScopeIds(selections: readonly ClassSubjectScopeSelection[]): string {
	const paths = selections
		.filter(row => row.classGroupId.trim().length > 0)
		.map((row) => {
			if (row.wildcard) {
				return `${row.classGroupId}:*`;
			}
			if (row.classSubjectId?.trim()) {
				return `${row.classGroupId}:${row.classSubjectId}`;
			}
			return '';
		})
		.filter(Boolean);
	return [...new Set(paths)].join(',');
}

export function composeStudentScopeIds(studentIds: readonly string[]): string {
	const ids = [...new Set(studentIds.map(id => id.trim()).filter(Boolean))];
	return ids.join(',');
}

export function composeActivityScopeIds(
	activityId: string,
	classGroupId?: string,
): string {
	const activity = activityId.trim();
	if (!activity) {
		return '';
	}
	return classGroupId?.trim() ? `${classGroupId.trim()}:${activity}` : activity;
}

export function parseClassGroupScopeIds(scopeIds: string): string[] {
	if (!scopeIds.trim()) {
		return [];
	}
	return scopeIds
		.split(';')
		.flatMap(clause => clause.split(','))
		.map(path => path.split(':')[0]?.trim() ?? '')
		.filter(Boolean);
}

export function parseClassSubjectScopeIds(scopeIds: string): ClassSubjectScopeSelection[] {
	if (!scopeIds.trim()) {
		return [];
	}

	const rows: ClassSubjectScopeSelection[] = [];
	for (const path of scopeIds.split(';').flatMap(clause => clause.split(','))) {
		const trimmed = path.trim();
		if (!trimmed) {
			continue;
		}
		const [classGroupId = '', second = ''] = trimmed.split(':').map(part => part.trim());
		if (!classGroupId) {
			continue;
		}
		if (second === '*') {
			rows.push({ classGroupId, wildcard: true });
			continue;
		}
		if (second) {
			rows.push({ classGroupId, classSubjectId: second });
		}
	}
	return rows;
}

export function parseStudentScopeIds(scopeIds: string): string[] {
	if (!scopeIds.trim()) {
		return [];
	}
	return scopeIds
		.split(';')
		.flatMap(clause => clause.split(','))
		.map(path => path.trim())
		.filter(Boolean);
}

export function parseActivityScopeIds(scopeIds: string): { activityId: string; classGroupId?: string } {
	const path = scopeIds.split(';')[0]?.split(',')[0]?.trim() ?? '';
	if (!path) {
		return { activityId: '' };
	}
	const [first, second] = path.split(':').map(part => part.trim());
	if (second) {
		return { classGroupId: first, activityId: second };
	}
	return { activityId: first ?? '' };
}

export function parseGradeLevelScopeIds(scopeIds: string): string {
	return scopeIds.split(';')[0]?.split(',')[0]?.trim() ?? '';
}
