#!/usr/bin/env bun
/**
 * Génère frontend-routes-inventory.xlsx — inventaire des routes SvelteKit (webapp + webadmin).
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
	LEGACY_ROUTES,
	ROUTE_REDIRECTS,
	ROUTE_DESCRIPTIONS,
	collectFilesystemRoutes,
	getWebadminFilesystemRoutes,
	getWebappFilesystemRoutes,
	resolveModuleFromPath,
	resolveRouteDescription,
	type RouteType,
} from './qa-route-catalog';

const ROOT = path.join(import.meta.dirname, '../../../..');
const WEBAPP_ROUTES = path.join(ROOT, 'edaya_web/apps/webapp/src/routes');
const WEBADMIN_ROUTES = path.join(ROOT, 'edaya_web/apps/webadmin/src/routes');
const XLSX_PATH = path.join(ROOT, 'frontend-routes-inventory.xlsx');
const CSV_PATH = path.join(ROOT, 'frontend-routes-inventory.csv');

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
		.replace(':level?', '6eme')}`;
}

function buildRows(app: 'webapp' | 'webadmin', routesDir: string): RouteRow[] {
	const routes = app === 'webapp'
		? getWebappFilesystemRoutes()
		: collectFilesystemRoutes(routesDir).filter(r => !(r.url === '/' && r.type === 'layout-only'));

	return routes
		.map((r) => {
			const redirect = ROUTE_REDIRECTS[r.url] ?? (r.type === 'redirect' ? '(voir +page.ts)' : '');
			return {
				app,
				module: resolveModuleFromPath(r.url, app),
				route: r.url,
				urlExample: toUrlExample(r.url, app),
				type: r.type,
				auth: resolveAuth(r.url, app),
				redirect,
				legacy: LEGACY_ROUTES.has(r.url) ? 'Oui' : '',
				description: resolveRouteDescription(r.url) || ROUTE_DESCRIPTIONS[r.url] || '',
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
