#!/usr/bin/env bun
/**
 * Génère frontend-routes-inventory.xlsx — inventaire des routes SvelteKit (webapp + webadmin).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

const ROOT = path.join(import.meta.dirname, '../../../..');
const WEBAPP_ROUTES = path.join(ROOT, 'edaya_web/apps/webapp/src/routes');
const WEBADMIN_ROUTES = path.join(ROOT, 'edaya_web/apps/webadmin/src/routes');
const XLSX_PATH = path.join(ROOT, 'frontend-routes-inventory.xlsx');
const CSV_PATH = path.join(ROOT, 'frontend-routes-inventory.csv');

type RouteType = 'page' | 'layout-only' | 'page+layout' | 'redirect';

interface RouteRow {
	app: 'webapp' | 'webadmin';
	module: string;
	route: string;
	urlExample: string;
	type: RouteType;
	auth: string;
	redirect: string;
	legacy: string;
	description: string;
}

const REDIRECTS: Record<string, string> = {
	'/': '/login',
	'/login/demo': '/login (si démo désactivée)',
	'/onboarding': '/onboarding?step=1 (sans paramètre step)',
	'/finance': '/finance/billing',
	'/configuration': '/configuration/subjects',
	'/classes/:classId': '/classes/:classId/students',
	'/school/students/:id?': '/school/students/:id/profile',
	'/school/staff/:id?': '/school/staff/:id/profile',
	'/school/teachers/:id?': '/school/teachers/:id/profile',
	'/school/activities/:id?': '/school/activities/:id/profile',
	'/configuration/classes/:id?': '/configuration/classes/:id/profile',
	'/configuration/subjects/:id?': '/configuration/subjects/:id/progression',
	'/classes/:classId/timetable/:id': '/classes/:classId/timetable/:id/details',
	'/classes/:classId/teaching/:id?': '/classes/:classId/teaching/:id/progression',
	'/classes/:classId/students/:id?': '/classes/:classId/students/:id/profile',
	'/classes/:classId/evaluations/:id?': '/classes/:classId/evaluations/:id/details',
	'/classes/:classId/subjects/:id?': '/classes/:classId/teaching/:id/progression',
	'/classes/:classId/homework/:id?': '/classes/:classId/evaluations/:id',
	'/configuration/staff/:id?': '/school/staff/:id?',
	'/configuration/roles/:role?': '/school/staff/:role? ou /school/staff',
	'/school/teacher-assignments': '/configuration/tools/teacher-assignments',
	'/configuration/subjects/level/:level?': '/configuration/subjects?gradeLevel=:level',
};

const LEGACY_ROUTES = new Set([
	'/classes/:classId/subjects/:id?',
	'/classes/:classId/homework/:id?',
	'/configuration/staff/:id?',
	'/configuration/roles/:role?',
	'/school/teacher-assignments',
	'/configuration/subjects/level/:level?',
]);

const DESCRIPTIONS: Record<string, string> = {
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
	'/school/events': 'Incidents discipline',
	'/school/teacher-assignments': 'Compatibilité → hub affectations enseignants',
	'/finance/fees': 'Configuration des frais',
	'/finance/billing': 'Facturation — liste',
	'/finance/billing/:id?': 'Facturation — détail élève',
	'/finance/payment': 'Paiements enregistrés',
	'/configuration/school': 'Paramètres école',
	'/configuration/academic': 'Années et périodes académiques',
	'/configuration/grade-levels': 'Niveaux scolaires',
	'/configuration/classes': 'Groupes-classes',
	'/configuration/subjects': 'Matières',
	'/configuration/subjects/level/:level?': 'Compatibilité → filtre matières par niveau',
	'/configuration/grade-scales': 'Barèmes de notes',
	'/configuration/report-cards': 'Modèles de bulletins',
	'/configuration/notifications': 'Templates notifications',
	'/configuration/discipline': 'Actions disciplinaires',
	'/configuration/tools': 'Outils (import, etc.)',
	'/configuration/tools/teacher-assignments': 'Hub affectations enseignants',
	'/classes/:classId/students': 'Élèves de la classe',
	'/classes/:classId/timetable': 'Emploi du temps',
	'/classes/:classId/teaching': 'Matières / enseignement',
	'/classes/:classId/evaluations': 'Évaluations',
	'/classes/:classId/attendance': 'Présences (mode quotidien)',
	'/classes/:classId/report-cards': 'Bulletins classe',
};

function segmentToUrl(seg: string): string | null {
	if (seg.startsWith('(') && seg.endsWith(')')) return null;
	if (seg.startsWith('[[', 0) && seg.endsWith(']]')) return `:${seg.slice(2, -2)}?`;
	if (seg.startsWith('[') && seg.endsWith(']')) return `:${seg.slice(1, -1)}`;
	return seg;
}

function collectRoutes(dir: string, segs: string[] = []): Array<{ url: string; type: RouteType; file: string }> {
	const out: Array<{ url: string; type: RouteType; file: string }> = [];
	if (!existsSync(dir)) return out;

	const entries = readdirSync(dir, { withFileTypes: true });
	const hasPage = entries.some(e => /^\+page\.(svelte|ts|js)$/.test(e.name));
	const hasLayout = entries.some(e => /^\+layout\.(svelte|ts|js)$/.test(e.name));
	const hasRedirectPage = entries.some(e => e.name === '+page.ts' || e.name === '+page.js');
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
		out.push(...collectRoutes(path.join(dir, entry.name), [...segs, entry.name]));
	}

	return out;
}

function resolveModule(url: string, app: 'webapp' | 'webadmin'): string {
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

function resolveAuth(url: string, app: 'webapp' | 'webadmin'): string {
	if (app === 'webadmin') return 'À définir (webadmin)';
	const publicRoutes = ['/', '/login', '/login/demo', '/onboarding', '/invite/:token'];
	if (publicRoutes.includes(url) || url.startsWith('/invite/')) return 'Public';
	return 'Session requise (+ permissions par module)';
}

function toUrlExample(url: string, app: 'webapp' | 'webadmin'): string {
	const base = app === 'webapp' ? 'http://localhost:5173' : 'http://localhost:5174';
	return `${base}${url
		.replace(':classId', 'ci-6a')
		.replace(':id?', 'abc123')
		.replace(':id', 'abc123')
		.replace(':token', 'invite-token')
		.replace(':role?', 'staff-id')
		.replace(':level?', '6eme')
		.replace(':role?', '')}`;
}

function resolveDescription(url: string): string {
	if (DESCRIPTIONS[url]) return DESCRIPTIONS[url];

	const tabMatch = url.match(/\/(profile|grades|report-card|attendance|enrollments|finances|incidents|assignments|permissions|availability|details|grading|logbook|progression|classes|students)$/);
	if (tabMatch) {
		const tab = tabMatch[1];
		const entity = url.includes('/school/students') || url.includes('/classes/')
			? 'élève'
			: url.includes('/school/staff') ? 'personnel'
				: url.includes('/school/teachers') ? 'enseignant'
					: url.includes('/school/activities') ? 'activité'
						: url.includes('/configuration/classes') ? 'classe'
							: url.includes('/configuration/subjects') ? 'matière'
								: url.includes('/classes/') && url.includes('/timetable/') ? 'séance'
									: url.includes('/evaluations/') ? 'évaluation'
										: 'ressource';
		return `Onglet ${tab} — ${entity}`;
	}

	if (url.includes('/:id?') || url.includes('/:id')) {
		return 'Vue détail (master-detail)';
	}

	return '';
}

function buildRows(app: 'webapp' | 'webadmin', routesDir: string): RouteRow[] {
	return collectRoutes(routesDir)
		.filter(r => !(r.url === '/' && r.type === 'layout-only'))
		.map((r) => {
			const redirect = REDIRECTS[r.url] ?? (r.type === 'redirect' ? '(voir +page.ts)' : '');
			return {
				app,
				module: resolveModule(r.url, app),
				route: r.url,
				urlExample: toUrlExample(r.url, app),
				type: r.type,
				auth: resolveAuth(r.url, app),
				redirect,
				legacy: LEGACY_ROUTES.has(r.url) ? 'Oui' : '',
				description: resolveDescription(r.url),
			};
		})
		.sort((a, b) => a.module.localeCompare(b.module) || a.route.localeCompare(b.route));
}

function autoWidth(sheet: ExcelJS.Worksheet) {
	sheet.columns.forEach((col) => {
		let max = 10;
		col.eachCell?.({ includeEmpty: false }, (cell) => {
			const len = String(cell.value ?? '').length;
			if (len > max) max = Math.min(len + 2, 60);
		});
		col.width = max;
	});
}

function styleHeader(sheet: ExcelJS.Worksheet) {
	const row = sheet.getRow(1);
	row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
	row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
	row.alignment = { vertical: 'middle', wrapText: true };
}

async function writeWorkbook(rows: RouteRow[]): Promise<void> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Edaya';
	workbook.created = new Date();

	const headers: Array<keyof RouteRow> = [
		'app', 'module', 'route', 'urlExample', 'type', 'auth', 'redirect', 'legacy', 'description',
	];

	const webappRows = rows.filter(r => r.app === 'webapp');
	const webadminRows = rows.filter(r => r.app === 'webadmin');
	const redirectRows = rows.filter(r => r.redirect || r.type === 'redirect');

	for (const [name, data] of [
		['Toutes les routes', rows],
		['webapp', webappRows],
		['webadmin', webadminRows],
		['Redirections', redirectRows],
	] as const) {
		const sheet = workbook.addWorksheet(name);
		sheet.addRow(headers);
		styleHeader(sheet);
		for (const row of data) {
			sheet.addRow(headers.map(h => row[h]));
		}
		sheet.views = [{ state: 'frozen', ySplit: 1 }];
		autoWidth(sheet);
	}

	const summary = workbook.addWorksheet('Synthèse');
	summary.addRow(['Application', 'Module', 'Nombre de routes']);
	styleHeader(summary);
	const counts = new Map<string, number>();
	for (const row of rows) {
		const key = `${row.app}|${row.module}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	for (const [key, count] of [...counts.entries()].sort()) {
		const [app, module] = key.split('|');
		summary.addRow([app, module, count]);
	}
	summary.addRow([]);
	summary.addRow(['Total', '', rows.length]);
	autoWidth(summary);

	await workbook.xlsx.writeFile(XLSX_PATH);

	const csvHeader = headers.join(';');
	const csvBody = rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(';')).join('\n');
	writeFileSync(CSV_PATH, `\uFEFF${csvHeader}\n${csvBody}`, 'utf-8');
}

async function main(): Promise<void> {
	const rows = [
		...buildRows('webapp', WEBAPP_ROUTES),
		...buildRows('webadmin', WEBADMIN_ROUTES),
	];

	await writeWorkbook(rows);

	console.log(`Inventaire frontend généré : ${rows.length} routes`);
	console.log(`  webapp:  ${rows.filter(r => r.app === 'webapp').length}`);
	console.log(`  webadmin: ${rows.filter(r => r.app === 'webadmin').length}`);
	console.log(`  XLSX: ${XLSX_PATH}`);
	console.log(`  CSV:  ${CSV_PATH}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
