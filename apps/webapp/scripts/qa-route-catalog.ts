/**
 * Shared route catalog for QA matrix, frontend inventory, and demo-dry-run scenes.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
	CLASS_NAV_DEFS,
	CONFIG_NAV_DEFS,
	FINANCE_NAV_DEFS,
	SCHOOL_NAV_DEFS,
	type NavItemDefinition,
} from '../src/lib/navigation/nav-catalog';
import { ACCOUNT_PROFILE_MODAL } from '../src/lib/account/profile-url';

export type RouteType = 'page' | 'layout-only' | 'page+layout' | 'redirect';

export interface FilesystemRoute {
	url: string;
	type: RouteType;
	file: string;
}

export interface DrawerTabPattern {
	name: string;
	/** Matrix-style path prefix, e.g. /school/students/[id] */
	routePattern: string;
	tabs: readonly string[];
}

export interface ModalSurface {
	/** Parent list or drawer route (matrix placeholders) */
	parentRoute: string;
	modal: string;
	/** Optional tab segment when modal opens on a drawer tab */
	tab?: string;
	module: string;
	/** UI journey step that must succeed before edit modal tests */
	setupStep?: string;
	/** When true, resolveEndpoint injects modalTarget from targetEntityKey */
	requiresTarget?: boolean;
	targetEntityKey?: string;
}

export interface SidebarHref {
	module: string;
	labelKey: string;
	/** Full path or class segment */
	href: string;
	classSegment?: boolean;
}

export const WEBAPP_ROUTES_DIR = path.join(import.meta.dirname, '../src/routes');
export const WEBADMIN_ROUTES_DIR = path.join(import.meta.dirname, '../../webadmin/src/routes');

/**
 * Module URL roots with no standalone page — layout shell or redirect hub only.
 * Sidebar links go directly to child routes; do not auto-smoke these paths.
 */
export const MODULE_NAMESPACE_ROOTS: readonly string[] = [
	'/school',
	'/finance',
	'/configuration',
];

/** Per-class module root (`/classes/:classId` redirects to students). */
export const CLASS_NAMESPACE_ROOT = '/classes/[classId]';

export function isNamespaceRootPath(matrixPath: string): boolean {
	const path = (matrixPath.split('?')[0] ?? matrixPath).replace(/\/$/, '') || '/';
	if (MODULE_NAMESPACE_ROOTS.includes(path)) return true;
	return path.toLowerCase() === CLASS_NAMESPACE_ROOT.toLowerCase();
}

/** Documented redirect targets (inventory + matrix redirect smoke). */
export const ROUTE_REDIRECTS: Record<string, string> = {
	'/configuration/report-cards/:id?': '/configuration/structure/subjects',
	'/configuration/other/grade-scales': '/configuration/grade-scales',
	'/school/marks-review': '/school/corrections?workflow=grades',
	'/': '/login',
	'/login/demo': '/login',
	'/onboarding': '/onboarding?step=1',
	'/finance': '/finance/fees',
 '/finance/reconciliation': '/configuration/tools/finance-checks',
	'/configuration': '/configuration/structure/details',
	'/configuration/structure': '/configuration/structure/details',
	'/configuration/subjects': '/configuration/structure/subjects',
	'/configuration/classes': '/configuration/structure/classes',
	'/configuration/grade-levels': '/configuration/structure/details',
	'/classes/:classId': '/classes/:classId/students',
	'/school/students/:id?': '/school/students/:id/profile',
	'/school/staff/:id?/assignments': '/school/staff/:id/permissions',
	'/school/staff/:id?': '/school/staff/:id/profile',
	'/school/teachers/:id?': '/school/teachers/:id/profile',
	'/school/activities/:id?': '/school/activities/:id/profile',
	'/configuration/structure/classes/:id?': '/configuration/structure/classes/:id/profile',
	'/configuration/structure/subjects/:id?': '/configuration/structure/subjects/:id/progression',
	'/classes/:classId/timetable/:id': '/classes/:classId/timetable/:id/details',
	'/classes/:classId/teaching/:id?': '/classes/:classId/teaching/:id/progression',
	'/classes/:classId/students/:id?': '/classes/:classId/students/:id/profile',
	'/classes/:classId/evaluations/:id?': '/classes/:classId/evaluations/:id/details',
	'/classes/:classId/subjects/:id?': '/classes/:classId/teaching/:id/progression',
	'/classes/:classId/homework/:id?': '/classes/:classId/evaluations/:id',
	'/configuration/staff/:id?': '/school/staff',
	'/configuration/roles/:role?': '/school/staff',
	'/school/teacher-assignments': '/configuration/tools/teacher-assignments',
	'/configuration/structure/subjects/level/:level?': '/configuration/structure/subjects?gradeLevel=:level',
};

export const LEGACY_ROUTES = new Set([
	'/configuration/report-cards/:id?',
	'/school/staff/:id?/assignments',
	'/configuration/subjects',
	'/configuration/classes',
	'/configuration/grade-levels',
	'/configuration/other/grade-scales',
	'/classes/:classId/subjects/:id?',
	'/classes/:classId/homework/:id?',
	'/configuration/staff/:id?',
	'/configuration/roles/:role?',
	'/school/teacher-assignments',
	'/configuration/structure/subjects/level/:level?',
]);

export const ROUTE_DESCRIPTIONS: Record<string, string> = {
	'/': 'Racine — redirection login',
	'/login': 'Connexion email / mot de passe',
	'/login/demo': 'Connexion comptes démo (dev)',
	'/onboarding': 'Wizard onboarding école (4 étapes via ?step=)',
	'/invite/:token': 'Acceptation invitation compte',
	'/dashboard': 'Tableau de bord',
	'/account/inbox': 'Boîte de réception notifications',
	'/account/inbox/:id?': 'Détail notification',
	'/account/notifications': 'Préférences notifications',
	'/school/students': 'Liste élèves (école)',
	'/school/guardians': 'Liste responsables',
	'/school/staff': 'Liste personnel',
	'/school/teachers': 'Liste enseignants',
	'/school/calendar': 'Calendrier scolaire',
	'/school/activities': 'Activités parascolaires',
	'/school/announcements': 'Annonces',
	'/school/family-feedback': 'Retour des familles',
 '/school/messages': 'Messages des familles',
 '/school/messages/:id?': 'Conversation',
	'/school/events': 'Incidents discipline',
	'/school/teacher-assignments': 'Compatibilité → hub affectations enseignants',
	'/finance/fees': 'Vue financière et catalogue des frais',
 '/finance/fees/:feeId': 'Détail du frais',
 '/finance/billing/:id?/payments': 'Paiements appliqués',
 '/finance/billing/:id?/history': 'Historique de facturation',
 '/configuration/tools/finance-checks': 'Contrôles financiers',
	'/finance/billing': 'Facturation — liste',
	'/finance/billing/:id?': 'Facturation — détail élève',
	'/finance/payment': 'Paiements enregistrés',
	'/finance/reconciliation': 'Rapprochement financier',
	'/configuration/school': 'Paramètres école',
	'/configuration/academic': 'Années et périodes académiques',
	'/configuration/period-grid': 'Grille horaire hebdomadaire',
	'/configuration/other': 'Autres configurations',
	'/configuration/structure': 'Niveaux, matières et classes',
	'/configuration/structure/details': 'Détails du niveau',
	'/configuration/structure/classes': 'Groupes-classes',
	'/configuration/structure/subjects': 'Matières',
	'/configuration/structure/subjects/level/:level?': 'Compatibilité → filtre matières par niveau',
	'/configuration/grade-scales': 'Barèmes de notes',
	'/configuration/notifications': 'Templates notifications',
	'/configuration/notifications/[id]': 'Template notification — détail',
	'/configuration/other/discipline': 'Actions disciplinaires',
	'/configuration/other/subject-categories': 'Catégories de matières',
	'/configuration/permission-profiles': 'Profils de permissions',
	'/configuration/tools': 'Outils (import, etc.)',
	'/configuration/tools/teacher-assignments': 'Hub affectations enseignants',
	'/classes/:classId/students': 'Élèves de la classe',
	'/classes/:classId/timetable': 'Emploi du temps',
	'/classes/:classId/teaching': 'Matières / enseignement',
	'/classes/:classId/evaluations': 'Évaluations',
	'/classes/:classId/attendance': 'Présences (mode quotidien)',
	'/classes/:classId/report-cards': 'Bulletins classe',
};

export const DRAWER_TAB_PATTERNS: readonly DrawerTabPattern[] = [
	{
		name: 'school students',
		routePattern: '/school/students/[id]',
		tabs: ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'documents'],
	},
	{
		name: 'school staff',
		routePattern: '/school/staff/[id]',
		tabs: ['profile', 'permissions'],
	},
	{
		name: 'school teachers',
		routePattern: '/school/teachers/[id]',
		tabs: ['profile', 'assignments', 'availability', 'timetable', 'evaluations', 'family-feedback', 'documents'],
	},
	{
		name: 'school activities',
		routePattern: '/school/activities/[id]',
		tabs: ['profile', 'students', 'classes'],
	},
	{
		name: 'school family feedback',
		routePattern: '/school/family-feedback/[id]',
		tabs: ['setup', 'audience', 'moderation', 'results'],
	},
	{
		name: 'configuration classes',
		routePattern: '/configuration/structure/classes/[id]',
		tabs: ['profile', 'assignments'],
	},
	{
		name: 'configuration subjects',
		routePattern: '/configuration/structure/subjects/[id]',
		tabs: ['progression', 'logbook'],
	},
	{
		name: 'class teaching',
		routePattern: '/classes/[classId]/teaching/[id]',
		tabs: ['progression', 'logbook', 'students'],
	},
	{
		name: 'class students',
		routePattern: '/classes/[classId]/students/[id]',
		tabs: ['profile', 'grades', 'attendance', 'incidents', 'finances', 'report-card', 'documents'],
	},
	{
		name: 'class evaluations',
		routePattern: '/classes/[classId]/evaluations/[id]',
		tabs: ['details', 'grading'],
	},
	{
		name: 'class timetable session',
		routePattern: '/classes/[classId]/timetable/[sessionId]',
		tabs: ['details', 'attendance', 'logbook'],
	},
];

/** URL-backed modal surfaces for matrix deep-link smoke tests. */
export const MODAL_SURFACES: readonly ModalSurface[] = [
	{ module: 'École', parentRoute: '/school/students', modal: 'create' },
	{ module: 'École', parentRoute: '/school/guardians', modal: 'create' },
	{ module: 'École', parentRoute: '/school/staff', modal: 'create' },
	{ module: 'École', parentRoute: '/school/teachers', modal: 'create' },
	{ module: 'École', parentRoute: '/school/calendar', modal: 'create' },
	{
		module: 'École',
		parentRoute: '/school/calendar',
		modal: 'edit',
		setupStep: 'calendar-event',
		requiresTarget: true,
		targetEntityKey: 'calendarEventId',
	},
	{ module: 'École', parentRoute: '/school/activities', modal: 'create' },
	{ module: 'École', parentRoute: '/school/announcements', modal: 'create' },
	{ module: 'École', parentRoute: '/school/family-feedback', modal: 'create' },
 { module: 'École', parentRoute: '/school/messages/[id]', modal: 'reply' },
	{ module: 'École', parentRoute: '/school/events', modal: 'create' },
	{ module: 'École', parentRoute: '/school/students/[id]/profile', modal: 'edit-profile' },
 { module: 'École', parentRoute: '/school/students/[id]/profile', modal: 'change-status' },
 { module: 'Classes', parentRoute: '/classes/[classId]/students/[id]/profile', modal: 'change-status' },
	{ module: 'École', parentRoute: '/school/students/[id]/profile', modal: 'change-class' },
	{ module: 'École', parentRoute: '/school/students/[id]/profile', modal: 'link-guardian' },
	{ module: 'École', parentRoute: '/school/students/[id]/profile', modal: 'note' },
	{ module: 'École', parentRoute: '/school/students/[id]/attendance', modal: 'add-absence' },
	{ module: 'École', parentRoute: '/school/students/[id]/incidents', modal: 'add-incident' },
	{ module: 'École', parentRoute: '/school/guardians/[id]', modal: 'edit-profile' },
	{ module: 'École', parentRoute: '/school/staff/[id]/profile', modal: 'edit-profile' },
	{ module: 'École', parentRoute: '/school/staff/[id]/permissions', modal: 'add-permission' },
	{ module: 'École', parentRoute: '/school/teachers/[id]/assignments', modal: 'form' },
	{ module: 'École', parentRoute: '/school/teachers/[id]/assignments', modal: 'delete-assignment' },
	{ module: 'École', parentRoute: '/school/teachers/[id]/documents', modal: 'generate-document' },
	{ module: 'École', parentRoute: '/school/announcements/[id]', modal: 'edit' },
	{ module: 'École', parentRoute: '/school/announcements/[id]', modal: 'add-target' },
	{ module: 'École', parentRoute: '/school/announcements/[id]', modal: 'publish' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/setup', modal: 'edit' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/setup', modal: 'assign-moderator' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/setup', modal: 'schedule' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/setup', modal: 'open' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/setup', modal: 'close' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/setup', modal: 'cancel' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/moderation', modal: 'theme' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/results', modal: 'publish' },
	{ module: 'École', parentRoute: '/school/family-feedback/[id]/results', modal: 'archive' },
	{ module: 'École', parentRoute: '/school/events/[id]', modal: 'edit' },
	{ module: 'École', parentRoute: '/school/events/[id]', modal: 'resolve' },
	{ module: 'Classes', parentRoute: '/classes/[classId]/students', modal: 'create' },
	{ module: 'Classes', parentRoute: '/classes/[classId]/teaching/[id]/progression', modal: 'edit-subject' },
	{ module: 'Finance', parentRoute: '/finance/fees', modal: 'create' },
	{ module: 'Finance', parentRoute: '/finance/billing', modal: 'assign-fee' },
	{ module: 'Finance', parentRoute: '/finance/billing/[id]', modal: 'payment' },
	{ module: 'Finance', parentRoute: '/finance/billing/[id]', modal: 'allocate' },
	{ module: 'Finance', parentRoute: '/finance/billing/[id]', modal: 'unallocate' },
	{ module: 'Finance', parentRoute: '/finance/payment', modal: 'reverse' },
	{ module: 'Finance', parentRoute: '/finance/payment', modal: 'refund' },
 { module: 'Finance', parentRoute: '/finance/payment', modal: 'payment' },
 { module: 'Finance', parentRoute: '/finance/fees/[feeId]', modal: 'assign-fee' },
	{ module: 'Configuration', parentRoute: '/configuration/school', modal: 'location' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/details', modal: 'create-level' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/details', modal: 'edit-level' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/details', modal: 'level-grading' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/classes', modal: 'create' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/classes/[id]/profile', modal: 'edit' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/classes/[id]/assignments', modal: 'form' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects', modal: 'create-subject' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects', modal: 'module-create' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects', modal: 'module-edit', requiresTarget: true, targetEntityKey: 'reportModuleId' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects', modal: 'module-members', requiresTarget: true, targetEntityKey: 'reportModuleId' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects', modal: 'module-delete', requiresTarget: true, targetEntityKey: 'reportModuleId' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects', modal: 'report-settings' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/subjects/[id]/progression', modal: 'add-chapter' },
	{ module: 'Configuration', parentRoute: '/configuration/grade-scales', modal: 'create' },
	{ module: 'Configuration', parentRoute: '/configuration/structure/details', modal: 'create' },
	{
		module: 'Configuration',
		parentRoute: '/configuration/notifications',
		modal: 'reset-all',
	},
	{
		module: 'Configuration',
		parentRoute: '/configuration/notifications/[id]',
		modal: 'edit',
		setupStep: 'notification-template-key',
	},
	{
		module: 'Configuration',
		parentRoute: '/configuration/notifications/[id]',
		modal: 'reset-key',
		setupStep: 'notification-template-key',
	},
	{ module: 'Configuration', parentRoute: '/configuration/other/discipline', modal: 'create' },
	{ module: 'Configuration', parentRoute: '/configuration/other/subject-categories', modal: 'create' },
	{ module: 'Configuration', parentRoute: '/configuration/permission-profiles', modal: 'create' },
	{ module: 'Configuration', parentRoute: '/configuration/tools/teacher-assignments', modal: 'create' },
	{ module: 'Shell', parentRoute: '/dashboard', modal: ACCOUNT_PROFILE_MODAL },
];

function navDefsToSidebar(module: string, defs: NavItemDefinition[]): SidebarHref[] {
	return defs.map(def => ({
		module,
		labelKey: def.labelKey,
		href: def.href,
		classSegment: def.classSegment,
	}));
}

export const SIDEBAR_HREFS: readonly SidebarHref[] = [
	...navDefsToSidebar('École', SCHOOL_NAV_DEFS),
	...navDefsToSidebar('Classes', CLASS_NAV_DEFS),
	...navDefsToSidebar('Finance', FINANCE_NAV_DEFS),
	...navDefsToSidebar('Configuration', CONFIG_NAV_DEFS),
	{ module: 'Dashboard', labelKey: 'nav.dashboard', href: '/dashboard' },
];

function segmentToUrl(seg: string): string | null {
	if (seg.startsWith('(') && seg.endsWith(')')) return null;
	if (seg.startsWith('[[', 0) && seg.endsWith(']]')) return `:${seg.slice(2, -2)}?`;
	if (seg.startsWith('[') && seg.endsWith(']')) return `:${seg.slice(1, -1)}`;
	return seg;
}

export function collectFilesystemRoutes(dir: string, segs: string[] = []): FilesystemRoute[] {
	const out: FilesystemRoute[] = [];
	if (!existsSync(dir)) return out;

	const entries = readdirSync(dir, { withFileTypes: true });
	const hasPage = entries.some(e => /^\+page\.(svelte|ts|js)$/.test(e.name));
	const hasLayout = entries.some(e => /^\+layout\.(svelte|ts|js)$/.test(e.name));
	const pageTs = entries.find(e => e.name === '+page.ts' || e.name === '+page.js');
	const isRedirect = pageTs
		? readFileSync(path.join(dir, pageTs.name), 'utf-8').includes('redirect(')
		: false;

	const urlParts = segs.map(segmentToUrl).filter((s): s is string => Boolean(s));
	const url = urlParts.length ? `/${urlParts.join('/')}` : '/';

	if (hasPage || (hasLayout && !hasPage)) {
		let type: RouteType = 'page';
		if (isRedirect) type = 'redirect';
		else if (hasPage && hasLayout) type = 'page+layout';
		else if (!hasPage && hasLayout) type = 'layout-only';
		out.push({ url, type, file: dir });
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		out.push(...collectFilesystemRoutes(path.join(dir, entry.name), [...segs, entry.name]));
	}

	return out;
}

export function getWebappFilesystemRoutes(): FilesystemRoute[] {
	return collectFilesystemRoutes(WEBAPP_ROUTES_DIR).filter(r => !(r.url === '/' && r.type === 'layout-only'));
}

export function getWebadminFilesystemRoutes(): FilesystemRoute[] {
	return collectFilesystemRoutes(WEBADMIN_ROUTES_DIR).filter(r => !(r.url === '/' && r.type === 'layout-only'));
}

/** Map inventory `:param?` to matrix `[param]` placeholders. */
export function inventoryRouteToMatrixPath(url: string): string {
	return url
		.replace(/:classId/g, '[classId]')
 .replace(/:feeId/g, '[feeId]')
		.replace(/:sessionId/g, '[sessionId]')
		.replace(/:dayId/g, '[dayId]')
		.replace(/:level\?/g, '[level]')
		.replace(/:role\?/g, '[role]')
		.replace(/:token/g, '[token]')
		.replace(/:deliveryId/g, '[deliveryId]')
		.replace(/:id\?/g, '[id]')
		.replace(/:id/g, '[id]');
}

export function normalizeRoutePattern(endpoint: string): string {
	return endpoint
		.replace(/^https?:\/\/[^/]+/i, '')
		.replace(/\?.*$/, '')
		.replace(/\[classId\]/g, ':classId')
 .replace(/\[feeId\]/g, ':feeId')
		.replace(/\[sessionId\]/g, ':id')
		.replace(/\[dayId\]/g, ':id')
		.replace(/\[deliveryId\]/g, ':id')
		.replace(/\[level\]/g, ':level')
		.replace(/\[role\]/g, ':role')
		.replace(/\[token\]/g, ':token')
		.replace(/\[id\]/g, ':id')
		.toLowerCase();
}

export function resolveModuleFromPath(url: string, app: 'webapp' | 'webadmin' = 'webapp'): string {
	if (app === 'webadmin') return 'Admin';
	if (url === '/' || url.startsWith('/login') || url.startsWith('/onboarding') || url.startsWith('/invite')) {
		return 'Public';
	}
	if (url.startsWith('/dashboard')) return 'Dashboard';
	if (url.startsWith('/account')) return 'Compte';
	if (url.startsWith('/school')) return 'École';
	if (url.startsWith('/classes')) return 'Classes';
	if (url.startsWith('/finance')) return 'Finances';
	if (url.startsWith('/configuration')) return 'Configuration';
	return 'Autre';
}

export function resolveRouteDescription(url: string): string {
	if (ROUTE_DESCRIPTIONS[url]) return ROUTE_DESCRIPTIONS[url];

	const tabMatch = url.match(/\/(profile|grades|report-card|attendance|enrollments|finances|incidents|documents|assignments|permissions|availability|details|grading|logbook|progression|classes|students)$/);
	if (tabMatch) {
		return `Onglet ${tabMatch[1]}`;
	}

	if (url.includes('/:id?') || url.includes('/:id')) {
		return 'Vue détail (master-detail)';
	}

	return '';
}

export const ROUTE_SMOKE_ACTION = 'Navigation directe — contenu visible';
export const REDIRECT_SMOKE_ACTION = 'Redirect — cible attendue';
export const MODAL_DEEP_LINK_ACTION_PREFIX = 'Modal deep-link ?modal=';
export const SIDEBAR_LINK_ACTION_PREFIX = 'Sidebar — lien ';

export function modalDeepLinkAction(modal: string): string {
	return `${MODAL_DEEP_LINK_ACTION_PREFIX}${modal}`;
}

export function sidebarLinkAction(labelKey: string): string {
	return `${SIDEBAR_LINK_ACTION_PREFIX}${labelKey} accessible`;
}
