import type { ScopeGrain } from '$lib/api/scope-ids';

function splitScopePaths(scopeIds: string): string[] {
	return scopeIds
		.split(';')
		.flatMap(clause => clause.split(','))
		.map(path => path.trim())
		.filter(Boolean);
}

function pathCoversResource(grantPath: string, resourceSegments: readonly string[]): boolean {
	const grantSegments = grantPath.split(':').map(segment => segment.trim()).filter(Boolean);

	if (resourceSegments.length === 1 && grantSegments.length >= 1) {
		const leaf = grantSegments[grantSegments.length - 1];
		if (leaf === '*' || leaf === resourceSegments[0]) {
			return true;
		}
	}

	if (grantSegments.length > resourceSegments.length) {
		return false;
	}

	for (let index = 0; index < grantSegments.length; index++) {
		const grantSegment = grantSegments[index];
		if (grantSegment === '*') {
			return true;
		}
		if (grantSegment !== resourceSegments[index]) {
			return false;
		}
	}

	if (grantSegments.length < resourceSegments.length) {
		return grantSegments[grantSegments.length - 1] === '*';
	}

	return grantSegments.length === resourceSegments.length;
}

/** Whether path-based scope ids cover a resource path for a permission catalog grain. */
export function scopePathCovers(
	scopeIds: string,
	resourcePath: string,
	permissionScope?: ScopeGrain,
): boolean {
	if (scopeIds === '') {
		return permissionScope === undefined;
	}

	if (!permissionScope) {
		return false;
	}

	const resourceSegments = resourcePath.split(':').map(segment => segment.trim()).filter(Boolean);
	if (resourceSegments.length === 0) {
		return false;
	}

	return splitScopePaths(scopeIds).some(path => pathCoversResource(path, resourceSegments));
}

export function legacyScopeToResourcePath(
	scopeType: 'class_group' | 'course_assignment',
	scopeEntityId: string,
): string {
	return scopeEntityId;
}

const PERMISSION_SCOPE_GRAINS: Partial<Record<string, ScopeGrain>> = {
	GRADE_INPUT: 'class_group',
	GRADE_READ: 'class_group',
	GRADE_UPDATE: 'class_group',
	ATTENDANCE_RECORD: 'class_group',
	ATTENDANCE_READ: 'class_group',
	CLASS_LOGBOOK_CREATE: 'class_group',
	CLASS_LOGBOOK_READ: 'class_group',
	CLASS_LOGBOOK_UPDATE: 'class_group',
	DISCIPLINE_CREATE: 'class_group',
	DISCIPLINE_READ: 'class_group',
	TIMETABLE_CREATE: 'class_group',
	TIMETABLE_UPDATE: 'class_group',
	REPORT_CARD_CONFIGURE: 'class_group',
	REPORT_CARD_GENERATE: 'class_group',
	REPORT_CARD_PUBLISH: 'class_group',
};

export function permissionScopeGrain(permission: string): ScopeGrain | undefined {
	return PERMISSION_SCOPE_GRAINS[permission];
}
