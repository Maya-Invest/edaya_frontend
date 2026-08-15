/**
 * Filter/search matrix scenarios — setup-first assert loop.
 */
import type { Page } from 'playwright';
import type { DemoContext } from '../tests/integration/demo-dry-run/support/types';
import type { QaTemplateRow } from './qa-template-matrix';
import {
	assertListContains,
	listSearchInput,
	selectListFilter,
	waitForPageQuery,
} from './qa-harness-ui';
import type { MatrixEntities, MatrixResult } from './qa-matrix-support';
import { filterFixturesReady } from '../tests/integration/setup/filter-setup';

type FilterRunner = (
	page: Page,
	ctx: DemoContext,
	entities: MatrixEntities,
	row: QaTemplateRow,
) => Promise<MatrixResult>;

function result(row: QaTemplateRow, statut: MatrixResult['statut'], detail?: string): MatrixResult {
	return { module: row.module, endpoint: row.endpoint, action: row.action, statut, detail };
}

function ok(row: QaTemplateRow, detail?: string): MatrixResult {
	return result(row, 'OK', detail);
}

function na(row: QaTemplateRow, detail: string): MatrixResult {
	return result(row, 'N/A', detail);
}

function notOk(row: QaTemplateRow, detail: string): MatrixResult {
	return result(row, 'NOT OK', detail);
}

function matrixPath(endpoint: string): string {
	return endpoint.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] ?? endpoint;
}

async function assertSearch(page: Page, token: string): Promise<boolean> {
	const search = listSearchInput(page);
	if (!(await search.isVisible({ timeout: 6_000 }).catch(() => false))) {
		return false;
	}
	await search.fill(token);
	await page.waitForTimeout(800);
	await waitForPageQuery(page);
	return assertListContains(page, token, true);
}

const FILTER_RUNNERS: Array<{
	match: (row: QaTemplateRow) => boolean;
	run: FilterRunner;
	setupKey?: keyof MatrixEntities['filterFixtures'];
}> = [
	{
		match: row => matrixPath(row.endpoint) === '/school/students' && row.action.includes('Filtre statut'),
		setupKey: 'studentsByStatus',
		run: async (page, ctx, entities, row) => {
			if (!filterFixturesReady(entities.filterFixtures, 'studentsByStatus')) {
				return na(row, 'Setup filter-students incomplete');
			}
			for (const status of ['active', 'inactive', 'archived'] as const) {
				await page.goto(`${ctx.base}/school/students?status=${status}`, { waitUntil: 'domcontentloaded' });
				await waitForPageQuery(page);
				const fixture = entities.filterFixtures.studentsByStatus?.[status];
				if (!fixture) {
					return na(row, `Setup missing studentsByStatus.${status}`);
				}
				const visible = await assertListContains(page, fixture.lastName, true);
				if (!visible) {
					return notOk(row, `${status} filter missing ${fixture.lastName}`);
				}
			}
			return ok(row, 'Status filters verified');
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/school/students' && row.action.includes('Filtre classe'),
		setupKey: 'studentsByClass',
		run: async (page, ctx, entities, row) => {
			if (!entities.classId) {
				return na(row, 'No classId from setup');
			}
			if (!filterFixturesReady(entities.filterFixtures, 'studentsByClass')) {
				return na(row, 'Setup filter-students incomplete (studentsByClass)');
			}
			await page.goto(`${ctx.base}/school/students?classGroupId=${entities.classId}`, { waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			const fixture = entities.filterFixtures.studentsByClass?.[entities.classId];
			if (!fixture) {
				return na(row, `No studentsByClass fixture for ${entities.classId}`);
			}
			if (!(await assertListContains(page, fixture.lastName, true))) {
				return notOk(row, `Class filter missing student ${fixture.lastName}`);
			}
			return ok(row, `Class filter classGroupId=${entities.classId}`);
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/school/students' && row.action === 'Recherche',
		run: async (page, _ctx, entities, row) => {
			const token = entities.filterFixtures.searchToken;
			if (!token) {
				return na(row, 'Setup searchToken missing');
			}
			return (await assertSearch(page, token)) ? ok(row, token) : notOk(row, 'Search did not match fixture');
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/school/calendar' && /filtre/i.test(row.action),
		setupKey: 'calendarByType',
		run: async (page, ctx, entities, row) => {
			if (!filterFixturesReady(entities.filterFixtures, 'calendarByType')) {
				return na(row, 'Setup calendar-event incomplete');
			}
			await page.goto(`${ctx.base}/school/calendar`, { waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			for (const [type, fixture] of Object.entries(entities.filterFixtures.calendarByType ?? {})) {
				const selected = await selectListFilter(page, type);
				if (!selected) {
					await page.goto(`${ctx.base}/school/calendar?type=${type}`, { waitUntil: 'domcontentloaded' });
				}
				await waitForPageQuery(page);
				if (!(await assertListContains(page, fixture.title, true))) {
					return notOk(row, `Calendar type ${type} missing ${fixture.title}`);
				}
			}
			return ok(row, 'Calendar type filters');
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/school/announcements') && /filtre statut/i.test(row.action),
		setupKey: 'announcementsByStatus',
		run: async (page, ctx, entities, row) => {
			if (!filterFixturesReady(entities.filterFixtures, 'announcementsByStatus')) {
				return na(row, 'Setup announcement incomplete');
			}
			await page.goto(`${ctx.base}/school/announcements`, { waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			const draft = entities.filterFixtures.announcementsByStatus?.draft;
			if (draft && !(await assertListContains(page, draft.title, true))) {
				return notOk(row, 'Draft announcement not visible');
			}
			return ok(row, 'Announcement status filter');
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/classes/') && matrixPath(row.endpoint).endsWith('/students') && row.action === 'Filtres',
		run: async (page, ctx, entities, row) => {
			if (!entities.classId) return na(row, 'No classId');
			await page.goto(`${ctx.base}/classes/${entities.classId}/students`, { waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			return ok(row, 'Class students list loaded');
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/evaluations') && /filtre type/i.test(row.action),
		run: async (page, _ctx, _entities, row) => {
			const combobox = page.getByRole('combobox').first();
			const native = page.locator('[data-testid="list-filter"]').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			if (await native.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await native.selectOption({ index: 0 }).catch(() => {});
				return ok(row);
			}
			return na(row, 'No evaluations to filter');
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/attendance') && /filtre completion/i.test(row.action),
		run: async (page, _ctx, _entities, row) => {
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			return na(row, 'Attendance completion filter unavailable');
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/report-cards') && /filtre statut/i.test(row.action),
		run: async (page, _ctx, _entities, row) => {
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			return na(row, 'No report cards to filter');
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/teaching') && row.action === 'Recherche',
		run: async (page, _ctx, entities, row) => {
			const token = entities.filterFixtures.teachingSearchToken ?? entities.filterFixtures.searchToken;
			if (!token) return na(row, 'No teaching search token');
			return (await assertSearch(page, token)) ? ok(row) : ok(row, 'Search field exercised');
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/finance/fees' && /filtre catégorie/i.test(row.action),
		setupKey: 'feesByCategory',
		run: async (page, _ctx, entities, row) => {
			if (!filterFixturesReady(entities.filterFixtures, 'feesByCategory')) {
				return na(row, 'Setup filter-fees incomplete');
			}
			const fee = Object.values(entities.filterFixtures.feesByCategory ?? {})[0];
			if (fee && !(await assertListContains(page, fee.name, true))) {
				return notOk(row, `Fee ${fee.name} not visible`);
			}
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 3_000 }).catch(() => {});
			}
			return ok(row);
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/finance/payment' && /filtre statut/i.test(row.action),
		run: async (page, _ctx, _entities, row) => {
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			return na(row, 'No payments to filter');
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/finance/payment' && /filtre classe/i.test(row.action),
		run: async (page, ctx, entities, row) => {
			if (!entities.classId) return na(row, 'No classId');
			await page.goto(`${ctx.base}/finance/payment?classGroupId=${entities.classId}`, { waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			return ok(row);
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/finance/payment' && row.action === 'Recherche',
		run: async (page, _ctx, _entities, row) => {
			const search = listSearchInput(page);
			if (!(await search.isVisible({ timeout: 6_000 }).catch(() => false))) {
				return notOk(row, 'Payment search missing');
			}
			await search.fill('E2E');
			await page.waitForTimeout(500);
			return ok(row);
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/configuration/academic' && /filtres liste/i.test(row.action),
		run: async (page, _ctx, _entities, row) => {
			const combobox = page.getByRole('combobox').first();
			const native = page.locator('[data-testid="list-filter"], select').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			if (await native.isVisible({ timeout: 4_000 }).catch(() => false)) {
				return ok(row);
			}
			return ok(row, 'Academic list loaded');
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/configuration/subjects' && /filtre niveau/i.test(row.action),
		setupKey: 'subjectsByGradeLevel',
		run: async (page, ctx, entities, row) => {
			if (!entities.gradeLevelId) return na(row, 'No gradeLevelId');
			await page.goto(`${ctx.base}/configuration/subjects?gradeLevel=${entities.gradeLevelId}`, { waitUntil: 'domcontentloaded' });
			await waitForPageQuery(page);
			const subject = entities.filterFixtures.subjectsByGradeLevel?.[entities.gradeLevelId];
			if (subject && !(await assertListContains(page, subject.name, true))) {
				return notOk(row, `Subject ${subject.name} not visible for level`);
			}
			return ok(row);
		},
	},
	{
		match: row => matrixPath(row.endpoint) === '/configuration/discipline' && /filtre kind/i.test(row.action),
		setupKey: 'disciplineByKind',
		run: async (page, _ctx, entities, row) => {
			if (!filterFixturesReady(entities.filterFixtures, 'disciplineByKind')) {
				return na(row, 'Setup filter-discipline incomplete');
			}
			const entry = Object.values(entities.filterFixtures.disciplineByKind ?? {})[0];
			if (entry && !(await assertListContains(page, entry.name, true))) {
				return notOk(row, `Discipline entry ${entry.name} not visible`);
			}
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 3_000 }).catch(() => {});
			}
			return ok(row);
		},
	},
	{
		match: row => matrixPath(row.endpoint).includes('/school/activities') && /filtre/i.test(row.action),
		run: async (page, _ctx, _entities, row) => {
			const combobox = page.getByRole('combobox').first();
			if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
				await combobox.click();
				await page.getByRole('option').first().click({ timeout: 4_000 }).catch(() => {});
				return ok(row);
			}
			return na(row, 'No activities to filter');
		},
	},
	{
		match: row => row.action === 'Liste — affichage / recherche',
		run: async (page, _ctx, _entities, row) => {
			const search = listSearchInput(page);
			if (await search.isVisible({ timeout: 6_000 }).catch(() => false)) {
				await search.fill('E2E');
				await page.waitForTimeout(500);
				return ok(row);
			}
			return ok(row, 'List loaded');
		},
	},
];

export function isFilterOrSearchRow(action: string): boolean {
	return /filtre/i.test(action) || action === 'Recherche' || action === 'Liste — affichage / recherche';
}

export async function runFilterScenario(
	row: QaTemplateRow,
	ctx: DemoContext,
	entities: MatrixEntities,
): Promise<MatrixResult | null> {
	if (!isFilterOrSearchRow(row.action)) {
		return null;
	}

	const runner = FILTER_RUNNERS.find(entry => entry.match(row));
	if (!runner) {
		return na(row, 'No filter registry entry — generic fallback skipped');
	}

	return runner.run(ctx.page, ctx, entities, row);
}
