import type { StaffPermissionAssignmentView } from '$lib/api/staff-permission-assignments-data';
import { uniqueRenderedScopes } from '$lib/api/permission-scope-labels';

function timestamp(value: unknown): number {
	if (value instanceof Date)
		return value.getTime();
	return typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : Number.NaN;
}

export function effectiveProfileScopes(assignments: readonly StaffPermissionAssignmentView[], bindingId: string, now = Date.now()) {
	return uniqueRenderedScopes(assignments
		.filter(row => row.sourceProfileBindingId === bindingId && row.status === 'active'
			&& (!row.startsAt || timestamp(row.startsAt) <= now)
			&& (!row.endsAt || timestamp(row.endsAt) > now))
		.flatMap(row => row.renderedScopes)
		.filter(scope => !scope.missing));
}
