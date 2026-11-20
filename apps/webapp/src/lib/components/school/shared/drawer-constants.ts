import type { ActivityEnrollmentStatus, Incident, StaffRole, Subject } from '$lib/types/school';
import type { DrawerItem } from './drawer-types.ts';
import { BADGE, BADGE_DANGER, BADGE_INFO, BADGE_WARN } from '$lib/ui-tones';

export type Crud = 'C' | 'R' | 'U' | 'D';
export type PermissionScope = 'global' | 'class' | 'subject';

const drawerBadge = BADGE_INFO;

export const kindStyle: Record<NonNullable<DrawerItem>['kind'], string> = {
	student: drawerBadge,
	catalogSubject: drawerBadge,
	subject: drawerBadge,
	planning: drawerBadge,
	evaluation: drawerBadge,
	attendanceDay: drawerBadge,
	guardian: drawerBadge,
	staff: drawerBadge,
	teacher: drawerBadge,
	billing: drawerBadge,
	schoolYearEvent: drawerBadge,
	incident: BADGE_DANGER,
	level: drawerBadge,
	activity: drawerBadge,
	announcement: drawerBadge,
	familyFeedback: drawerBadge,
	reportCardResult: drawerBadge,
	gradeLevel: drawerBadge,
	classGroup: drawerBadge,
};

export const kindLabelKey: Record<NonNullable<DrawerItem>['kind'], string> = {
	student: 'drawer.student',
	catalogSubject: 'drawer.catalogSubject',
	subject: 'drawer.subject',
	planning: 'drawer.planning',
	evaluation: 'drawer.evaluation',
	attendanceDay: 'attendanceDay.drawerLabel',
	guardian: 'drawer.guardian',
	staff: 'drawer.staff',
	teacher: 'drawer.teacher',
	billing: 'drawer.invoice',
	schoolYearEvent: 'drawer.schoolYearEvent',
	incident: 'events.schoolLife',
	level: 'drawer.level',
	activity: 'drawer.activity',
	announcement: 'drawer.announcement',
	familyFeedback: 'drawer.familyFeedback',
	reportCardResult: 'drawer.reportCardResult',
	gradeLevel: 'drawer.gradeLevel',
	classGroup: 'drawer.classGroup',
};

export const relationKey: Partial<Record<string, string>> = {
	'Mother': 'guardian.relation.Mother',
	'Father': 'guardian.relation.Father',
	'Legal guardian': 'guardian.relation.LegalGuardian',
};

/** Known relations → i18n key; otherwise return the raw API string for display. */
export function guardianRelationLabel(relation: string): string {
	const knownRelation = Object.keys(relationKey).find(value => value.toLocaleLowerCase() === relation.trim().toLocaleLowerCase());
	return (knownRelation && relationKey[knownRelation]) || relation;
}

export const dotByColor: Record<Subject['color'], string> = {
	mint: 'bg-accent',
	sky: 'bg-accent/60',
	warm: 'bg-muted-foreground/40',
};

export const ENROLL_STATUS_STYLE: Record<ActivityEnrollmentStatus, string> = {
	approved: `${BADGE} border-border`,
	pending: `${BADGE_WARN} border-highlight/20`,
	denied: `${BADGE_DANGER} border-destructive/20`,
};

export const ENROLL_STATUS_LABEL_KEY: Record<ActivityEnrollmentStatus, string> = {
	approved: 'activities.enrollStatus.approved',
	pending: 'activities.enrollStatus.pending',
	denied: 'activities.enrollStatus.denied',
};

export const ENROLL_NEXT: Record<ActivityEnrollmentStatus, ActivityEnrollmentStatus> = {
	approved: 'pending',
	pending: 'denied',
	denied: 'approved',
};

export const incidentSevTone: Record<Incident['severity'], string> = {
	low: BADGE,
	medium: BADGE_WARN,
	high: BADGE_DANGER,
};

export const incidentCatTone: Record<Incident['category'], string> = {
	Behavior: BADGE_WARN,
	Tardiness: BADGE,
	Conflict: BADGE_DANGER,
	Other: BADGE,
};

export type StaffPermScope = PermissionScope;

export const STAFF_SCOPE_LABEL_KEY: Record<StaffPermScope, string> = {
	global: 'staff.scope.global',
	class: 'staff.scope.class',
	subject: 'staff.scope.subject',
};

export const STAFF_SCOPE_TONE: Record<StaffPermScope, string> = {
	global: `${BADGE_INFO} border-primary/20`,
	class: `${BADGE} border-border`,
	subject: `${BADGE} border-border`,
};

export type Scope = PermissionScope;

export const SCOPE_LABEL_KEY: Record<Scope, string> = {
	global: 'staff.scope.global',
	class: 'staff.scope.class',
	subject: 'staff.scope.subject',
};

export const SCOPE_TONE: Record<Scope, string> = {
	global: `${BADGE_INFO} border-primary/20`,
	class: `${BADGE} border-border`,
	subject: `${BADGE} border-border`,
};

export const ROLE_TINT: Record<StaffRole, string> = {
	owner: 'bg-primary/10 text-primary',
	directeur: 'bg-primary/10 text-primary',
	deputy_director: 'bg-primary/10 text-primary',
	studies_director: 'bg-primary/10 text-primary',
	educateur: 'bg-secondary text-foreground/80',
	cpe: 'bg-secondary text-foreground/80',
	secretary: 'bg-secondary text-foreground/80',
	accountant: 'bg-secondary text-foreground/80',
	it_admin: 'bg-secondary text-foreground/80',
	staff: 'bg-secondary text-foreground/80',
};

export const CRUD_KEYS: Crud[] = ['C', 'R', 'U', 'D'];

export const CRUD_LABEL_KEY: Record<Crud, string> = {
	C: 'common.add',
	R: 'common.open',
	U: 'common.edit',
	D: 'common.delete',
};

export const CRUD_TONE: Record<Crud, string> = {
	C: 'data-[on=true]:bg-primary/10 data-[on=true]:text-primary data-[on=true]:border-primary/20',
	R: 'data-[on=true]:bg-secondary data-[on=true]:text-foreground/80 data-[on=true]:border-border',
	U: 'data-[on=true]:bg-highlight-soft data-[on=true]:text-highlight data-[on=true]:border-highlight/20',
	D: 'data-[on=true]:bg-destructive/10 data-[on=true]:text-destructive data-[on=true]:border-destructive/20',
};

const SHORT_DATE: Intl.DateTimeFormatOptions = {
	day: '2-digit',
	month: 'short',
	year: 'numeric',
};

export function fmtActivityDate(d: string, dateLocale = 'fr-FR') {
	return new Date(d).toLocaleDateString(dateLocale, SHORT_DATE);
}

export function fmtDateFr(d: string, dateLocale = 'fr-FR') {
	return new Date(d).toLocaleDateString(dateLocale, SHORT_DATE);
}
