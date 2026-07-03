import type { Guardian, Subject, StaffRole, ActivityEnrollmentStatus, Incident } from '$lib/types/school';
import type { DrawerItem } from './drawer-types.ts';
import { BADGE, BADGE_DANGER, BADGE_INFO, BADGE_WARN } from '$lib/ui-tones';

export type Crud = 'C' | 'R' | 'U' | 'D';
export type PermissionScope = 'global' | 'class' | 'subject';

const drawerBadge = BADGE_INFO;

export const kindStyle: Record<NonNullable<DrawerItem>['kind'], string> = {
	student: drawerBadge,
	subject: drawerBadge,
	planning: drawerBadge,
	evaluation: drawerBadge,
	guardian: drawerBadge,
	staff: drawerBadge,
	deadline: drawerBadge,
	billing: drawerBadge,
	fee: drawerBadge,
	schoolYearEvent: drawerBadge,
	incident: BADGE_DANGER,
	staffPermissions: drawerBadge,
	level: drawerBadge,
	activity: drawerBadge,
	announcement: drawerBadge,
	reportCardDefinition: drawerBadge,
	reportCardResult: drawerBadge,
};

export const kindLabelKey: Record<NonNullable<DrawerItem>['kind'], string> = {
	student: 'drawer.student',
	subject: 'drawer.subject',
	planning: 'drawer.planning',
	evaluation: 'drawer.evaluation',
	guardian: 'drawer.guardian',
	staff: 'drawer.staff',
	deadline: 'drawer.deadline',
	billing: 'drawer.invoice',
	fee: 'drawer.fee',
	schoolYearEvent: 'drawer.schoolYearEvent',
	incident: 'events.schoolLife',
	staffPermissions: 'roles.title',
	level: 'drawer.level',
	activity: 'drawer.activity',
	announcement: 'drawer.announcement',
	reportCardDefinition: 'drawer.reportCardDefinition',
	reportCardResult: 'drawer.reportCardResult',
};

export const relationKey: Record<Guardian['relation'], string> = {
	'Mother': 'guardian.relation.Mother',
	'Father': 'guardian.relation.Father',
	'Legal guardian': 'guardian.relation.LegalGuardian',
};

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

export const ENROLL_STATUS_LABEL: Record<ActivityEnrollmentStatus, string> = {
	approved: 'Autorisé',
	pending: 'En attente',
	denied: 'Refusé',
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

export const STAFF_SCOPE_LABEL: Record<StaffPermScope, string> = {
	global: 'Globale',
	class: 'Classe',
	subject: 'Matière',
};

export const STAFF_SCOPE_TONE: Record<StaffPermScope, string> = {
	global: `${BADGE_INFO} border-primary/20`,
	class: `${BADGE} border-border`,
	subject: `${BADGE} border-border`,
};

export type Scope = PermissionScope;

export const SCOPE_LABEL: Record<Scope, string> = { global: 'Globale', class: 'Classe', subject: 'Matière' };

export const SCOPE_TONE: Record<Scope, string> = {
	global: `${BADGE_INFO} border-primary/20`,
	class: `${BADGE} border-border`,
	subject: `${BADGE} border-border`,
};

export const ROLE_TINT: Record<StaffRole, string> = {
	owner: 'bg-primary/10 text-primary',
	directeur: 'bg-primary/10 text-primary',
	prof_principal: 'bg-primary/10 text-primary',
	professeur: 'bg-secondary text-foreground/80',
	educateur: 'bg-secondary text-foreground/80',
};

export const CRUD_KEYS: Crud[] = ['C', 'R', 'U', 'D'];

export const CRUD_LABEL: Record<Crud, string> = {
	C: 'Créer',
	R: 'Lire',
	U: 'Modifier',
	D: 'Supprimer',
};

export const CRUD_TONE: Record<Crud, string> = {
	C: 'data-[on=true]:bg-primary/10 data-[on=true]:text-primary data-[on=true]:border-primary/20',
	R: 'data-[on=true]:bg-secondary data-[on=true]:text-foreground/80 data-[on=true]:border-border',
	U: 'data-[on=true]:bg-highlight-soft data-[on=true]:text-highlight data-[on=true]:border-highlight/20',
	D: 'data-[on=true]:bg-destructive/10 data-[on=true]:text-destructive data-[on=true]:border-destructive/20',
};

export function fmtActivityDate(d: string) {
	return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateFr(d: string) {
	return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
