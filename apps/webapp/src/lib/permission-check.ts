import type { ActionGrantsSnapshot, PermissionCode } from '$lib/auth/types';

type AuthorityScope = ActionGrantsSnapshot[number]['scopes'][number];

export interface PermissionContext {
	classId?: string;
	/** Class-subject identifier, always paired with its class when available. */
	subject?: string;
	gradeLevelId?: string;
	subjectId?: string;
	studentId?: string;
	activityId?: string;
	lessonSessionId?: string;
	activitySessionId?: string;
	assessmentId?: string;
	academicYearId?: string;
	schoolId?: string;
}

function matchesScope(scope: AuthorityScope, ctx: PermissionContext): boolean {
	if (scope.kind === 'school')
		return true;
	if (scope.kind === 'all') {
		switch (scope.grain) {
			case 'class_group': return Boolean(ctx.classId);
			case 'grade_level': return Boolean(ctx.gradeLevelId);
			case 'subject': return Boolean(ctx.gradeLevelId || ctx.subjectId);
			case 'activity': return Boolean(ctx.activityId);
			case 'student': return Boolean(ctx.studentId);
		}
	}
	switch (scope.kind) {
		case 'class_group': return ctx.classId === scope.classGroupId;
		case 'grade_level': return ctx.gradeLevelId === scope.gradeLevelId;
		case 'subject': return (!ctx.subject || Boolean(ctx.subjectId))
			&& (!scope.classGroupId || ctx.classId === scope.classGroupId)
			&& (!ctx.gradeLevelId || ctx.gradeLevelId === scope.gradeLevelId)
			&& (ctx.subjectId ? scope.subjectId ? ctx.subjectId === scope.subjectId : ctx.gradeLevelId === scope.gradeLevelId : Boolean(ctx.gradeLevelId));
		case 'activity': return Boolean(ctx.activityId || ctx.classId)
			&& (!scope.activityId || ctx.activityId === scope.activityId)
			&& (!scope.classGroupId || ctx.classId === scope.classGroupId);
		case 'student': return ctx.studentId === scope.studentId;
		case 'lesson_session': return ctx.lessonSessionId === scope.lessonSessionId
			&& (!ctx.classId || ctx.classId === scope.classGroupId) && (!ctx.subject || ctx.subject === scope.classSubjectId);
		case 'activity_session': return ctx.activitySessionId === scope.activitySessionId
			&& (!ctx.classId || ctx.classId === scope.classGroupId) && (!ctx.activityId || ctx.activityId === scope.activityId);
		case 'assessment': return ctx.assessmentId === scope.assessmentId
			&& (!ctx.classId || ctx.classId === scope.classGroupId) && (!ctx.subject || ctx.subject === scope.classSubjectId);
	}
}

/** UI affordances from the server's action projection; resource policies still enforce every request. */
export function checkPermission(
	grants: ActionGrantsSnapshot | null,
	permission: PermissionCode,
	ctx: PermissionContext = {},
): boolean {
	const now = Date.now();
	const hasResource = Boolean(ctx.classId || ctx.subject || ctx.gradeLevelId || ctx.subjectId || ctx.studentId || ctx.activityId || ctx.lessonSessionId || ctx.activitySessionId || ctx.assessmentId);
	return grants?.some(grant => grant.permission === permission
		&& (!ctx.academicYearId || !grant.academicYearId || grant.academicYearId === ctx.academicYearId)
		&& (!grant.startsAt || Date.parse(grant.startsAt) <= now)
		&& (!grant.endsAt || Date.parse(grant.endsAt) > now)
		&& grant.scopes.some(scope => !hasResource || matchesScope(scope, ctx))) ?? false;
}

export function checkAnyPermission(
	grants: ActionGrantsSnapshot | null,
	permissions: readonly PermissionCode[],
	ctx: PermissionContext = {},
): boolean {
	return permissions.some(permission => checkPermission(grants, permission, ctx));
}
