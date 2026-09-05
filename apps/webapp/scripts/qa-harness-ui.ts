import type { Locator, Page } from 'playwright';
import {
	academicYearLabelFromDates,
	defaultAcademicYearPreset,
} from '../src/lib/onboarding/school-step-defaults';
import { waitForEnabled } from '../tests/integration/demo-dry-run/support/auth';
import { waitForAppShell } from './qa-matrix-support';

export async function waitForPageQuery(page: Page): Promise<void> {
	await page
		.locator('[role="status"] .animate-spin')
		.waitFor({ state: 'detached', timeout: 30_000 })
		.catch(() => {});
}

export async function dismissPageError(page: Page): Promise<void> {
	const retryBtn = page.getByRole('button', { name: /réessayer|retry/i });
	if (await retryBtn.isVisible().catch(() => false)) {
		await retryBtn.click();
		await waitForPageQuery(page);
	}
}

export async function refreshAppShell(page: Page, base: string): Promise<void> {
	await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await page.waitForTimeout(1_500);
}

export async function setAppLang(page: Page, next: 'en' | 'fr'): Promise<boolean> {
	const current = await page.locator('html').getAttribute('lang');
	if (current === next) {
		return true;
	}

	const trigger = page.getByTestId('language-selector');
	if (!(await trigger.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return false;
	}

	await trigger.click();
	const option = page.getByTestId(`language-option-${next}`);
	if (!(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
		await page.keyboard.press('Escape').catch(() => {});
		return false;
	}

	await option.click();
	await page.waitForFunction(
		(lang) => document.documentElement.lang === lang,
		next,
		{ timeout: 8_000 },
	).catch(() => {});

	return (await page.locator('html').getAttribute('lang')) === next;
}

/** Clear stale year/period picks from prior tenants in the same browser session. */
export async function clearAcademicSelectionStorage(page: Page): Promise<void> {
	await page.evaluate(() => {
		sessionStorage.removeItem('edaya:yearId');
		sessionStorage.removeItem('edaya:periodId');
	});
}

export async function waitForResolvedAcademicYearId(page: Page, timeout = 20_000): Promise<void> {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		const yearId = await page.evaluate(() => sessionStorage.getItem('edaya:yearId'));
		if (yearId && yearId.length > 0) {
			return;
		}
		await page.waitForTimeout(250);
	}
	// Fallback: shell may show the year before sessionStorage is written on slow boots.
	await page.getByText(/\b\d{4}-\d{4}\b/).first().waitFor({ state: 'visible', timeout: 5_000 });
}

/** Keep date inputs inside their min/max (academic-year bounds on calendar create). */
export async function fillDateInputsInRange(scope: Locator): Promise<void> {
	const dateInputs = scope.locator('input[type="date"]');
	const dateCount = await dateInputs.count();
	for (let index = 0; index < dateCount; index += 1) {
		const input = dateInputs.nth(index);
		const current = await input.inputValue().catch(() => '');
		const min = (await input.getAttribute('min')) ?? '';
		const max = (await input.getAttribute('max')) ?? '';
		const inRange = current.length > 0
			&& (min.length === 0 || current >= min)
			&& (max.length === 0 || current <= max);
		if (inRange) {
			continue;
		}
		await input.fill(min.length > 0 ? min : new Date().toISOString().slice(0, 10));
	}
}

export async function visibleDialogCount(page: Page): Promise<number> {
	return page.getByRole('dialog').evaluateAll(nodes =>
		nodes.filter(node => node instanceof HTMLElement && node.checkVisibility()).length,
	);
}

export async function dismissOpenDialogs(page: Page): Promise<void> {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		if ((await visibleDialogCount(page)) === 0) {
			return;
		}
		await page.keyboard.press('Escape').catch(() => {});
		await page.waitForTimeout(200);
	}
}

export async function waitForDialogClosed(page: Page, timeout = 15_000): Promise<boolean> {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if ((await visibleDialogCount(page)) === 0) {
			return true;
		}
		await page.waitForTimeout(120);
	}
	return (await visibleDialogCount(page)) === 0;
}

function mainContentScope(page: Page): Locator {
	return page.locator('main, [role="main"]').first();
}

export const LIST_SORT_TEST_ID = 'list-sort';

const SORT_APPLIED_NAME = /tri croissant|tri décroissant|sorted ascending|sorted descending/i;

function listSortState(url: string): string {
	const parsed = new URL(url);
	return `${parsed.searchParams.get('sort') ?? ''}|${parsed.searchParams.get('sortDir') ?? ''}`;
}

async function ensureTableViewForSort(page: Page): Promise<void> {
	if (await page.getByTestId(LIST_SORT_TEST_ID).first().isVisible().catch(() => false)) {
		return;
	}
	const more = page.getByTestId('list-more-menu');
	if (!(await more.isVisible().catch(() => false))) {
		return;
	}
	await more.click({ timeout: 3_000 }).catch(() => {});
	const tableView = page.getByRole('button', { name: /vue tableau|table view/i });
	if (await tableView.isVisible({ timeout: 2_000 }).catch(() => false)) {
		await tableView.click();
		return;
	}
	await page.keyboard.press('Escape').catch(() => {});
}

/** Click the first sortable list column and wait until sort is reflected in the URL or aria state. */
export async function clickFirstListSortColumn(page: Page): Promise<boolean> {
	await ensureTableViewForSort(page);
	const sortBtn = page.getByTestId(LIST_SORT_TEST_ID)
		.or(page.getByRole('columnheader').getByRole('button'))
		.or(page.locator('th button, th[role="columnheader"]'))
		.first();
	if (!(await sortBtn.isVisible({ timeout: 4_000 }).catch(() => false))) {
		return false;
	}

	const before = listSortState(page.url());
	const clicked = await sortBtn.click({ timeout: 3_000 }).then(() => true).catch(() => false);
	if (!clicked) {
		return false;
	}

	const deadline = Date.now() + 5_000;
	while (Date.now() < deadline) {
		if (listSortState(page.url()) !== before) {
			return true;
		}
		const label = await sortBtn.getAttribute('aria-label').catch(() => null);
		if (label && SORT_APPLIED_NAME.test(label)) {
			return true;
		}
		const ariaSort = await sortBtn.evaluate((el) => {
			const header = el.closest('[aria-sort]');
			return header?.getAttribute('aria-sort') ?? el.getAttribute('aria-sort');
		}).catch(() => null);
		if (ariaSort === 'ascending' || ariaSort === 'descending') {
			return true;
		}
		await page.waitForTimeout(100);
	}
	return false;
}

/** Canonical list-page search — `ListSearchField` exposes data-testid="list-search". */
export function listSearchInput(page: Page): Locator {
	const scoped = mainContentScope(page).locator('[data-testid="list-search"]');
	return scoped.or(page.locator('[data-testid="list-search"]'));
}

export type ListSelectionExportResult =
	| { status: 'ok' }
	| { status: 'na'; detail: string }
	| { status: 'fail'; detail: string };

/**
 * More → Sélectionner/Select (not the stub Exporter) → check first row → Exporter on the selection bar.
 * Product export lives on ListSelectionBar; the More-menu Exporter is list.exportSoon.
 */
export async function exportSelectedListRows(page: Page): Promise<ListSelectionExportResult> {
	const more = page.getByTestId('list-more-menu');
	if (!(await more.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return { status: 'na', detail: 'Menu Plus absent' };
	}

	await more.click({ timeout: 3_000 });

	const enterSelect = page.getByRole('button', { name: /^(sélectionner|select)$/i });
	if (!(await enterSelect.isVisible({ timeout: 3_000 }).catch(() => false))) {
		await page.keyboard.press('Escape').catch(() => {});
		return { status: 'na', detail: 'Action Sélectionner absente' };
	}
	await enterSelect.click();

	const selectionBar = page.getByText(/sélectionnez des lignes|select rows to export/i);
	await selectionBar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

	const rowCheckbox = page.getByRole('checkbox', { name: /^(sélectionner la ligne|select row)$/i }).first();
	if (!(await rowCheckbox.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return { status: 'na', detail: 'Liste vide' };
	}
	await rowCheckbox.click();

	const exportBtn = page.getByRole('button', { name: /^(exporter|export)$/i }).first();
	if (!(await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return { status: 'fail', detail: 'Bouton Exporter de la barre de sélection absent' };
	}
	if (await exportBtn.isDisabled().catch(() => true)) {
		return { status: 'fail', detail: 'Exporter reste désactivé après sélection' };
	}

	const download = page.waitForEvent('download', { timeout: 8_000 }).catch(() => null);
	await exportBtn.click();
	await download;
	return { status: 'ok' };
}

/**
 * Matrix actions are French intent labels ("Créer évaluation"); the UI uses i18n
 * primary buttons ("Add evaluation" / "Ajouter une évaluation", etc.).
 */
export function resolveCreateButtonPatterns(action: string, endpoint: string): RegExp[] {
	const patterns: RegExp[] = [];
	const push = (...regexes: RegExp[]) => {
		patterns.push(...regexes);
	};

	const endpointLower = endpoint.toLowerCase();
	const actionLower = action.toLowerCase();

	if (endpointLower.includes('/evaluations')) {
		push(/add evaluation|ajouter une évaluation/i);
	}
	if (endpointLower.includes('/homework') || endpointLower.includes('/deadlines')) {
		push(/add deadline|ajouter une échéance/i);
	}
	if (endpointLower.includes('/school/students')
		|| (endpointLower.includes('/classes/') && endpointLower.includes('/students'))) {
		push(/add student|ajouter un élève/i);
	}
	if (endpointLower.includes('/school/guardians')) {
		push(/add guardian|ajouter un tuteur/i);
	}
	if (endpointLower.includes('/school/staff')) {
		push(/add staff member|ajouter un membre/i);
	}
	if (endpointLower.includes('/school/teachers')) {
		push(/add teacher|ajouter un enseignant/i);
	}
	if (endpointLower.includes('/school/events')) {
		push(/add incident|ajouter un incident/i);
	}
	if (endpointLower.includes('/school/activities')) {
		push(/add activity|ajouter une activité/i);
	}
	if (endpointLower.includes('/school/announcements')) {
		push(/add announcement|ajouter une annonce/i);
	}
	if (endpointLower.includes('/school/calendar')) {
		push(/add event|ajouter un évènement|ajouter un événement/i);
	}
	if (endpointLower.includes('/finance/fees')) {
		push(/add fee|ajouter un frais/i);
	}
	if (endpointLower.includes('/finance/billing')) {
		push(/add invoice|ajouter une facture/i);
	}
	if (endpointLower.includes('/configuration/subjects')) {
		push(/add subject|ajouter une matière/i);
	}
	if (endpointLower.includes('/configuration/grade-levels')) {
		push(/add grade level|ajouter un niveau/i);
	}
	if (endpointLower.includes('/configuration/classes')) {
		push(/add class|ajouter une classe/i);
	}
	if (endpointLower.includes('/configuration/academic')) {
		push(/add academic year|ajouter une année scolaire/i);
	}
	if (endpointLower.includes('/configuration/grade-scales')) {
		push(/add scale|ajouter un barème/i);
	}
	if (endpointLower.includes('/configuration/report-cards')) {
		push(/add model|ajouter un modèle/i);
	}
	if (endpointLower.includes('/planning')) {
		push(/add session|ajouter une séance|add schedule|ajouter un emploi du temps/i);
	}

	if (/évaluation/.test(actionLower)) {
		push(/add evaluation|ajouter une évaluation/i);
	}
	if (/élève|student/.test(actionLower) && !/frais|factur/.test(actionLower)) {
		push(/add student|ajouter un élève/i);
	}
	if (/tuteur|guardian/.test(actionLower)) {
		push(/add guardian|ajouter un tuteur/i);
	}
	if (/personnel|staff/.test(actionLower)) {
		push(/add staff member|ajouter un membre/i);
	}
	if (/enseignant|teacher/.test(actionLower)) {
		push(/add teacher|ajouter un enseignant/i);
	}
	if (/incident/.test(actionLower)) {
		push(/add incident|ajouter un incident/i);
	}
	if (/activit/.test(actionLower)) {
		push(/add activity|ajouter une activité/i);
	}
	if (/annonce/.test(actionLower)) {
		push(/add announcement|ajouter une annonce/i);
	}
	if (/événement|évènement/.test(actionLower) && !/incident/.test(actionLower)) {
		push(/add event|ajouter un évènement|ajouter un événement/i);
	}
	if (/frais|fee/.test(actionLower)) {
		push(/add fee|ajouter un frais/i);
	}
	if (/matière|subject/.test(actionLower)) {
		push(/add subject|ajouter une matière/i);
	}
	if (/niveau|grade level/.test(actionLower)) {
		push(/add grade level|ajouter un niveau/i);
	}
	if (/classe/.test(actionLower) && !/élève/.test(actionLower)) {
		push(/add class|ajouter une classe/i);
	}
	if (/année scolaire|academic year/.test(actionLower)) {
		push(/add academic year|ajouter une année scolaire/i);
	}
	if (/modèle|model/.test(actionLower)) {
		push(/add model|ajouter un modèle/i);
	}

	push(/^(add|ajouter)\s/i);

	return [...new Map(patterns.map(pattern => [pattern.source, pattern])).values()];
}

export async function openDialogButton(
	page: Page,
	name: RegExp,
	timeout = 20_000,
	scope?: Locator,
): Promise<boolean> {
	const root = scope ?? page;
	const btn = root.getByRole('button', { name }).first();
	try {
		await btn.waitFor({ state: 'visible', timeout });
		await waitForEnabled(btn);
		await btn.click();
		await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 });
		return true;
	}
	catch {
		return false;
	}
}

export async function clickCreateButton(
	page: Page,
	action: string,
	endpoint: string,
): Promise<boolean> {
	await waitForPageQuery(page);
	await dismissPageError(page);
	const scope = mainContentScope(page);
	const patterns = resolveCreateButtonPatterns(action, endpoint);
	for (const pattern of patterns) {
		if (await openDialogButton(page, pattern, 6_000, scope)) {
			return true;
		}
	}
	// Fallback when layout has no <main> yet (slow shell boot).
	for (const pattern of patterns.slice(0, 3)) {
		if (await openDialogButton(page, pattern, 4_000)) {
			return true;
		}
	}
	return false;
}

function formModalSubmit(
	page: Page,
	label: RegExp = /enregistrer|save changes|^save$|add note|ajouter une note|ajouter une facture|add invoice/i,
): Locator {
	const modal = page.getByTestId('form-modal');
	const dialog = modal.or(page.getByRole('dialog'));
	return modal.getByTestId('form-modal-submit')
		.or(dialog.getByRole('button', { name: label }))
		.last();
}

export async function waitForSubmitEnabled(page: Page, timeout = 15_000): Promise<boolean> {
	const submit = formModalSubmit(page);
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if (await submit.isVisible().catch(() => false) && !(await submit.isDisabled().catch(() => true))) {
			return true;
		}
		await page.waitForTimeout(150);
	}
	return false;
}

export async function submitDialog(
	page: Page,
	label: RegExp = /enregistrer|save changes|^save$|add note|ajouter une note/i,
): Promise<void> {
	const submit = formModalSubmit(page, label);
	await waitForEnabled(submit);
	await submit.click();
}

/** Like submitDialog, but returns false instead of throwing when Save stays disabled. */
export async function trySubmitDialog(page: Page): Promise<boolean> {
	try {
		await submitDialog(page);
		return true;
	}
	catch {
		return false;
	}
}

export async function waitForFormModal(page: Page, timeout = 12_000): Promise<boolean> {
	const dialog = page.locator('[data-testid="form-modal"]').or(page.getByRole('dialog'));
	return dialog.first().isVisible({ timeout }).catch(() => false);
}

/** Live input values — Svelte bind:value does not set the HTML value attribute. */
export async function dialogHasInputValue(dialog: Locator, pattern: RegExp): Promise<boolean> {
	const inputs = dialog.locator('input');
	const started = Date.now();
	while (Date.now() - started < 8_000) {
		const count = await inputs.count();
		for (let i = 0; i < count; i++) {
			const value = await inputs.nth(i).inputValue().catch(() => '');
			if (pattern.test(value)) {
				return true;
			}
		}
		await dialog.page().waitForTimeout(250);
	}
	return false;
}

/** Visit a route with ?modal= (and optional modalTarget) and wait for the dialog. */
export async function openUrlModal(
	page: Page,
	pathname: string,
	modal: string,
	options: { target?: string; step?: string; timeout?: number; base?: string } = {},
): Promise<boolean> {
	const origin = options.base ?? new URL(page.url()).origin;
	const url = new URL(pathname.startsWith('http') ? pathname : `${origin}${pathname}`);
	url.searchParams.set('modal', modal);
	if (options.target) {
		url.searchParams.set('modalTarget', options.target);
	}
	if (options.step) {
		url.searchParams.set('modalStep', options.step);
	}
	await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);
	await dismissPageError(page);
	return waitForFormModal(page, options.timeout ?? 12_000);
}

export async function pickFirstPerson(page: Page): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	const trigger = dialog.locator('button').filter({ has: page.locator('svg') }).first();
	if (!(await trigger.isVisible().catch(() => false))) {
		return false;
	}
	await trigger.click();
	const option = page.getByRole('option').first();
	if (!(await option.isVisible({ timeout: 8_000 }).catch(() => false))) {
		await page.keyboard.press('Escape').catch(() => {});
		return false;
	}
	await option.click();
	return true;
}

/** Native `<select>` filter. Do not include `[data-testid="list-filter"]` — that is the FilterPanel button. */
export const LIST_FILTER_NATIVE_LOCATOR
	= 'select[data-testid="list-filter-select"], select[aria-label="Filter"]';

export async function selectListFilter(page: Page, value: string): Promise<boolean> {
	const native = page.locator(LIST_FILTER_NATIVE_LOCATOR).first();
	if (await native.isVisible({ timeout: 4_000 }).catch(() => false)) {
		await native.selectOption(value);
		return true;
	}
	const combobox = page.getByRole('combobox').first();
	if (await combobox.isVisible({ timeout: 4_000 }).catch(() => false)) {
		await combobox.click();
		const option = page.getByRole('option', { name: new RegExp(value, 'i') }).first();
		if (await option.isVisible({ timeout: 4_000 }).catch(() => false)) {
			await option.click();
			return true;
		}
		await page.getByRole('option').first().click({ timeout: 3_000 }).catch(() => {});
		return true;
	}
	return false;
}

export async function openFilterPanel(page: Page, titlePattern: RegExp): Promise<boolean> {
	const panel = page.locator('section, div').filter({ has: page.getByText(titlePattern) }).first();
	if (await panel.isVisible({ timeout: 3_000 }).catch(() => false)) {
		return true;
	}
	const filterBtn = page.getByRole('button', { name: /filtre|filter/i }).first();
	if (await filterBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await filterBtn.click();
		return true;
	}
	return false;
}

export async function assertListContains(page: Page, text: string, visible = true, timeout = 12_000): Promise<boolean> {
	const row = page.locator('main').getByText(text, { exact: false }).first()
		.or(page.getByText(text, { exact: false }).first());
	const isVisible = await row.isVisible({ timeout }).catch(() => false);
	return visible ? isVisible : !isVisible;
}

export async function assertListCount(page: Page, min: number, max?: number): Promise<boolean> {
	const rows = page.locator('main table tbody tr, main ul li [role="button"][tabindex="0"]');
	const count = await rows.count();
	if (count < min) return false;
	if (max !== undefined && count > max) return false;
	return true;
}

/** ClassGroupFormModal — grade levels come from academicContext, not placeholder options. */
/** ClassGroupFormModal — grade levels come from academicContext, not placeholder options. */
export async function waitForGradeLevelSelectOptions(
	dialog: Locator,
	minOptions = 1,
	timeout = 20_000,
): Promise<Locator> {
	const gradeSelect = dialog.locator('select').first();
	await gradeSelect.waitFor({ state: 'visible', timeout });
	const started = Date.now();
	while (Date.now() - started < timeout) {
		const count = await gradeSelect.locator('option').count();
		if (count >= minOptions) {
			return gradeSelect;
		}
		await new Promise(resolve => setTimeout(resolve, 250));
	}
	throw new Error('Grade level select has no options — shell may not include created levels yet');
}

/** GradeLevelFormModal — name and label are both required (label may mirror name on input). */
export async function fillGradeLevelCreateDialog(page: Page, levelName: string): Promise<void> {
	const dialog = page.getByRole('dialog');
	const nameInput = dialog.locator('input').first();
	const labelInput = dialog.locator('input').nth(1);
	const submit = dialog.getByRole('button', { name: /enregistrer|save changes|^save$/i }).last();

	await nameInput.waitFor({ state: 'visible', timeout: 15_000 });

	const fillFields = async () => {
		await nameInput.fill(levelName);
		await labelInput.fill(levelName);
		const orderInput = dialog.locator('input[type="number"]');
		if (await orderInput.isVisible().catch(() => false)) {
			const orderValue = await orderInput.inputValue();
			if (!orderValue || Number(orderValue) < 1) {
				await orderInput.fill('1');
			}
		}
	};

	const started = Date.now();
	while (Date.now() - started < 15_000) {
		await fillFields();
		if (!(await submit.isDisabled())) {
			await submit.click();
			return;
		}
		await page.waitForTimeout(150);
	}

	throw new Error('Grade level submit stayed disabled — name/label may have been reset by the form');
}

export const ACADEMIC_YEAR_START_DATE_CONTROL = /date de début|start date/i;
export const ACADEMIC_YEAR_END_DATE_CONTROL = /date de fin|end date/i;

/** Create-year modal: dates only; heading is the derived `YYYY-YYYY` label. */
export async function fillAcademicYearCreateDialog(
	page: Page,
	dates: { start: string; end: string } = defaultAcademicYearPreset(),
): Promise<string> {
	const dialog = page.getByRole('dialog');
	const start = dialog.getByLabel(ACADEMIC_YEAR_START_DATE_CONTROL);
	const end = dialog.getByLabel(ACADEMIC_YEAR_END_DATE_CONTROL);
	if (await start.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await start.fill(dates.start);
		await end.fill(dates.end);
	}
	else {
		const dateInputs = dialog.locator('input[type="date"]');
		await dateInputs.nth(0).fill(dates.start);
		await dateInputs.nth(1).fill(dates.end);
	}
	return academicYearLabelFromDates(dates.start, dates.end);
}

export async function fillClassCreateDialog(
	page: Page,
	className: string,
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').first().fill(className);
	const gradeSelect = await waitForGradeLevelSelectOptions(dialog);
	await gradeSelect.selectOption({ index: 0 });
	const attendanceSelect = dialog.locator('select').filter({
		has: page.locator('option[value="daily"]'),
	}).last();
	if (await attendanceSelect.isVisible().catch(() => false)) {
		await attendanceSelect.selectOption('daily');
		await attendanceSelect.evaluate((el) => {
			if (!(el instanceof HTMLSelectElement)) {
				return;
			}
			el.value = 'daily';
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		});
	}
	const modal = page.getByTestId('form-modal');
	const submit = modal.getByRole('button', { name: /enregistrer|save changes|^save$/i }).last();
	await waitForEnabled(submit);
	await Promise.all([
		page.waitForResponse(
			(response) => response.url().includes('/core/commands/create-class-group')
				&& response.request().method() === 'POST',
			{ timeout: 30_000 },
		),
		submit.click(),
	]);
	await page.waitForTimeout(500);
}

/**
 * StudentCreateModal — requires classGroupId; invite email required when checkbox is checked.
 * Uses bits-ui Select (combobox) when classes exist; otherwise fails fast with a clear message.
 */
export async function selectComboboxOption(
	page: Page,
	combobox: Locator,
	match: { value?: string; name?: RegExp | string } = {},
): Promise<void> {
	await combobox.click();
	if (match.value) {
		const byValue = page.locator(`[role="option"][data-value="${match.value}"]`).first();
		if (await byValue.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await byValue.click();
			return;
		}
	}
	if (match.name) {
		const pattern = typeof match.name === 'string' ? new RegExp(match.name, 'i') : match.name;
		const option = page.getByRole('option', { name: pattern }).first();
		if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await option.click();
			return;
		}
	}
	await page.getByRole('option').first().click({ timeout: 10_000 });
}

export async function fillStudentCreateDialog(
	page: Page,
	options: { firstName?: string; lastName?: string; className?: RegExp | string } = {},
): Promise<void> {
	const dialog = page.getByRole('dialog');
	const firstName = options.firstName ?? 'E2E';
	const lastName = options.lastName ?? `Student${Date.now()}`;
	await dialog.locator('input').nth(0).fill(firstName);
	await dialog.locator('input').nth(1).fill(lastName);

	const noClasses = await dialog.getByText(/no classes|aucune classe|pas de classe/i).isVisible().catch(() => false);
	if (noClasses) {
		throw new Error('No classes in academicContext.hierarchy — create a class before adding a student');
	}

	const classTrigger = dialog.getByRole('combobox').first();
	if (await classTrigger.isVisible().catch(() => false)) {
		if (options.className) {
			await selectComboboxOption(page, classTrigger, { name: options.className });
		}
		else {
			await selectComboboxOption(page, classTrigger);
		}
	}

	const inviteCheckbox = dialog.locator('#student-send-invite');
	if (await inviteCheckbox.isVisible().catch(() => false)) {
		const checked = await inviteCheckbox.isChecked().catch(() => true);
		if (checked) {
			await inviteCheckbox.click();
		}
	}

	const submit = dialog.getByRole('button', { name: /add student|ajouter un élève|créer|create|enregistrer|save/i }).last();
	await waitForEnabled(submit);
	await submit.click();
}

/** Staff / teacher / guardian create modals — first+last name, skip invite email. */
export async function fillPersonCreateDialog(
	page: Page,
	options: { firstName?: string; lastName?: string } = {},
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').nth(0).fill(options.firstName ?? 'E2E');
	await dialog.locator('input').nth(1).fill(options.lastName ?? `Person${Date.now()}`);

	const invite = dialog.locator('#staff-send-invite, #teacher-send-invite, #guardian-send-invite, [id$="-send-invite"]');
	const count = await invite.count();
	for (let i = 0; i < count; i++) {
		const box = invite.nth(i);
		if (await box.isVisible().catch(() => false) && await box.isChecked().catch(() => false)) {
			await box.click();
		}
	}

	await submitDialog(page);
}

/** Staff / teacher / guardian create — keep invite on and fill email. */
export async function fillPersonCreateDialogWithInvite(
	page: Page,
	options: { email: string; firstName?: string; lastName?: string },
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').nth(0).fill(options.firstName ?? 'E2E');
	await dialog.locator('input').nth(1).fill(options.lastName ?? `Person${Date.now()}`);

	const invite = dialog.locator('#staff-send-invite, #teacher-send-invite, #guardian-send-invite, [id$="-send-invite"]');
	const count = await invite.count();
	for (let i = 0; i < count; i++) {
		const box = invite.nth(i);
		if (await box.isVisible().catch(() => false) && !(await box.isChecked().catch(() => false))) {
			await box.click();
		}
	}

	const emailInput = dialog.locator('input[type="email"]').first();
	if (await emailInput.isVisible().catch(() => false)) {
		await emailInput.fill(options.email);
	}
	else {
		const inputs = dialog.locator('input:not([type="checkbox"])');
		const inputCount = await inputs.count();
		if (inputCount >= 3) {
			await inputs.nth(2).fill(options.email);
		}
	}

	const submit = dialog.getByTestId('form-modal-submit')
		.or(dialog.getByRole('button', { name: /save|enregistrer|add teacher|ajouter|créer|create/i }))
		.last();
	await waitForEnabled(submit);
	await submit.click();
}

const nextButtonName = /^(next|suivant)$/i;
const createButtonName = /create|créer|session|séance/i;

async function clickWizardSubmit(page: Page, label?: RegExp): Promise<boolean> {
	const submit = page.getByTestId('form-modal-submit')
		.or(label ? page.getByRole('dialog').getByRole('button', { name: label }) : page.getByRole('dialog').getByRole('button').last())
		.last();
	if (!(await submit.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return false;
	}
	await waitForEnabled(submit);
	await submit.click();
	return true;
}

/** Drive the 3-step new-session wizard on the class timetable page. */
export async function fillNewSessionWizard(
	page: Page,
	options: { classId: string; title?: string; base?: string },
): Promise<string | null> {
	try {
		const title = options.title ?? `E2E-Session-${Date.now()}`;
		const base = options.base ?? '';
		const timetablePath = `/classes/${options.classId}/timetable?modal=new-session&modalStep=type`;
		await page.goto(`${base}${timetablePath}`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		await waitForPageQuery(page);

		const dialog = page.getByRole('dialog');
		if (!(await dialog.isVisible({ timeout: 15_000 }).catch(() => false))) {
			const opened = await openDialogButton(page, /new session|nouvelle séance|add session|ajouter une séance/i);
			if (!opened) {
				return null;
			}
		}

		if (!(await clickWizardSubmit(page, nextButtonName))) {
			return null;
		}
		await page.waitForTimeout(500);

		const titleInput = dialog.locator('input').first();
		if (await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await titleInput.fill(title);
		}
		const noSubjects = await dialog.getByText(/no subject|aucune matière|createNoSubjects/i).isVisible().catch(() => false);
		if (noSubjects) {
			return null;
		}
		const subjectTrigger = dialog.getByRole('combobox').first()
			.or(dialog.locator('button').filter({ hasText: /subject|matière/i }).first());
		if (await subjectTrigger.isVisible().catch(() => false)) {
			await selectComboboxOption(page, subjectTrigger);
		}
		if (!(await clickWizardSubmit(page, nextButtonName))) {
			return null;
		}
		await page.waitForTimeout(500);

		const materializePromise = page.waitForResponse(
			res => res.request().method() === 'POST'
				&& (res.url().includes('/core/commands/materialize-schedule')
					|| res.url().includes('/core/commands/create-schedule')),
			{ timeout: 45_000 },
		).catch(() => null);

		if (!(await clickWizardSubmit(page, createButtonName))) {
			await trySubmitDialog(page);
		}
		await waitForDialogClosed(page).catch(() => {});
		await waitForPageQuery(page);

		const materializeResponse = await materializePromise;
		let sessionId: string | null = null;
		if (materializeResponse?.ok()) {
			try {
				const body = await materializeResponse.json() as unknown;
				if (Array.isArray(body) && body[0] && typeof body[0] === 'object' && body[0] !== null && 'id' in body[0]) {
					sessionId = String((body[0] as { id: string }).id);
				}
				else if (body && typeof body === 'object' && 'id' in body) {
					sessionId = String((body as { id: string }).id);
				}
			}
			catch {
				// scrape from page
			}
		}

		if (!sessionId) {
			const match = page.url().match(new RegExp(`/classes/${options.classId}/timetable/([^/?]+)`));
			sessionId = match?.[1] ?? null;
		}
		if (!sessionId) {
			const link = page.locator(`main a[href*="/classes/${options.classId}/timetable/"]`).first();
			if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
				const href = await link.getAttribute('href');
				sessionId = href?.match(/\/timetable\/([^/?]+)/)?.[1] ?? null;
			}
		}

		return sessionId;
	}
	catch {
		return null;
	}
}

/** Generate a report card for the first student (or named student) on the class report-cards list. */
export async function generateReportCardForStudent(
	page: Page,
	classId: string,
	studentName?: string,
): Promise<string | null> {
	await waitForPageQuery(page);

	const generateResponse = page.waitForResponse(
		res => res.request().method() === 'POST'
			&& res.url().includes('/core/commands/generate-report-card-result')
			&& res.ok(),
		{ timeout: 30_000 },
	).catch(() => null);

	if (studentName) {
		const row = page.locator('main tr').filter({ hasText: studentName }).first();
		const generateBtn = row.getByRole('button', { name: /generate|générer/i }).first();
		if (await generateBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
			await generateBtn.click();
		}
	}
	else {
		const generateBtn = page.getByRole('button', { name: /generate|générer/i }).first();
		if (await generateBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
			await generateBtn.click();
		}
		else {
			const generateAll = page.getByRole('button', { name: /generate all|générer tout|tout générer/i }).first();
			if (await generateAll.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await generateAll.click();
			}
		}
	}

	const generateResult = await generateResponse;
	if (generateResult) {
		try {
			const body = await generateResult.json() as { id?: string };
			if (typeof body.id === 'string') {
				return body.id;
			}
		}
		catch {
			// scrape from page
		}
	}

	await waitForPageQuery(page);
	await page.waitForTimeout(1_500);

	const match = page.url().match(new RegExp(`/classes/${classId}/report-cards/([^/?]+)`));
	if (match?.[1]) {
		return match[1];
	}
	const link = page.locator(`main a[href*="/classes/${classId}/report-cards/"]`).first();
	if (await link.isVisible({ timeout: 8_000 }).catch(() => false)) {
		const href = await link.getAttribute('href');
		return href?.match(/\/report-cards\/([^/?]+)/)?.[1] ?? null;
	}
	const viewBtn = page.getByRole('button', { name: /view|voir|consulter/i }).first();
	if (await viewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await viewBtn.click();
		await page.waitForTimeout(800);
		return page.url().match(/\/report-cards\/([^/?]+)/)?.[1] ?? null;
	}
	return null;
}

/** GradeScaleFormModal — name is required; min/max/passing already default to 0/20/10. */
export async function fillGradeScaleCreateDialog(page: Page, scaleName: string): Promise<void> {
	const dialog = page.getByRole('dialog');
	const nameInput = dialog.locator('input').first();
	await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
	const started = Date.now();
	while (Date.now() - started < 12_000) {
		await nameInput.fill(scaleName);
		if (await waitForSubmitEnabled(page, 400)) {
			await submitDialog(page);
			return;
		}
		await page.waitForTimeout(150);
	}
	throw new Error('Grade scale Save stayed disabled');
}

async function waitForSelectOptionCount(
	select: Locator,
	minOptions: number,
	timeout = 15_000,
): Promise<boolean> {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if (await select.locator('option').count() >= minOptions) {
			return true;
		}
		await select.page().waitForTimeout(250);
	}
	return false;
}

/** Report-card model create — name + grade level + grade scale are all required. */
export async function fillReportCardDefinitionDialog(
	page: Page,
	options: {
		name: string;
		gradeLevelId?: string | null;
		gradeLevelName?: string;
		gradeScaleId?: string | null;
		gradeScaleName?: string;
	} = { name: 'E2E-RC' },
): Promise<void> {
	const dialog = page.getByRole('dialog');
	const nameInput = dialog.locator('input').first();
	await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
	await nameInput.fill(options.name);

	const nativeSelects = dialog.locator('select');
	const gradeSelect = nativeSelects.nth(0);
	const scaleSelect = nativeSelects.nth(1);

	if (await gradeSelect.isVisible().catch(() => false)) {
		if (!(await waitForSelectOptionCount(gradeSelect, 1))) {
			throw new Error('Report-card grade level select has no options');
		}
		if (options.gradeLevelId) {
			await gradeSelect.selectOption(options.gradeLevelId).catch(() => gradeSelect.selectOption({ index: 0 }));
		}
		else {
			await gradeSelect.selectOption({ index: 0 });
		}
	}

	if (await scaleSelect.isVisible().catch(() => false)) {
		if (!(await waitForSelectOptionCount(scaleSelect, 1))) {
			throw new Error('Report-card scale select has no options — create a grade scale first');
		}
		if (options.gradeScaleId) {
			await scaleSelect.selectOption(options.gradeScaleId).catch(() => scaleSelect.selectOption({ index: 0 }));
		}
		else if (options.gradeScaleName) {
			await scaleSelect.selectOption({ label: options.gradeScaleName }).catch(() => scaleSelect.selectOption({ index: 0 }));
		}
		else {
			await scaleSelect.selectOption({ index: 0 });
		}
	}

	const started = Date.now();
	while (Date.now() - started < 10_000) {
		await nameInput.fill(options.name);
		if (await waitForSubmitEnabled(page, 400)) {
			return;
		}
		await page.waitForTimeout(200);
	}
}

/** Activity create — name, coach, and description are required (dates default to today). */
export async function fillActivityCreateDialog(
	page: Page,
	options: { name: string; coach?: string; description?: string } = { name: 'E2E-Activity' },
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').first().fill(options.name);
	const coachInput = dialog.locator('input:not([type="number"]):not([type="date"])').nth(1);
	await coachInput.fill(options.coach ?? 'E2E Coach');
	await dialog.locator('textarea').first().fill(options.description ?? 'E2E activity description');
	await waitForSubmitEnabled(page);
}

export async function fillIncidentCreateDialog(
	page: Page,
	options: { title: string; description?: string; studentName?: string } = { title: 'E2E-Incident' },
): Promise<void> {
	const dialog = page.getByRole('dialog');
	if (!(await waitForSubmitEnabled(page, 2_000))) {
		if (options.studentName) {
			const picker = dialog.locator('button').filter({ has: page.locator('svg') }).first();
			if (await picker.isVisible().catch(() => false)) {
				await picker.click();
				const search = page.locator('[role="dialog"] input, [data-state="open"] input').last();
				await search.fill(options.studentName);
				const option = page.getByRole('option', { name: new RegExp(options.studentName, 'i') }).first();
				if (await option.isVisible({ timeout: 8_000 }).catch(() => false)) {
					await option.click();
				}
				else {
					await page.getByRole('option').first().click({ timeout: 5_000 }).catch(() => {});
				}
			}
		}
		else {
			await pickFirstPerson(page);
		}
	}
	await dialog.locator('input:not([type="date"])').first().fill(options.title);
	const textarea = dialog.locator('textarea').first();
	if (await textarea.isVisible().catch(() => false)) {
		await textarea.fill(options.description ?? 'E2E incident description');
	}
	await waitForSubmitEnabled(page);
}

export async function fillAssignFeeDialog(page: Page): Promise<boolean> {
	if (await waitForSubmitEnabled(page, 8_000)) {
		return true;
	}
	await pickFirstPerson(page);
	const feeCombo = page.getByRole('dialog').getByRole('combobox').first();
	if (await feeCombo.isVisible().catch(() => false)) {
		await selectComboboxOption(page, feeCombo);
	}
	return waitForSubmitEnabled(page);
}

export async function fillEvaluationCreateDialog(page: Page, title: string): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	const empty = await dialog.getByText(/aucune|empty|no (subject|matière)/i).isVisible().catch(() => false);
	if (empty) {
		return false;
	}
	const titleInput = dialog.locator('input:not([type="number"]):not([type="date"])').first();
	await titleInput.waitFor({ state: 'visible', timeout: 8_000 });
	const started = Date.now();
	while (Date.now() - started < 12_000) {
		await titleInput.fill(title);
		if (await waitForSubmitEnabled(page, 400)) {
			return true;
		}
		await page.waitForTimeout(250);
	}
	const subjectCombo = dialog.getByRole('combobox').nth(1);
	if (await subjectCombo.isVisible().catch(() => false)) {
		await selectComboboxOption(page, subjectCombo);
	}
	await titleInput.fill(title);
	return waitForSubmitEnabled(page);
}

/** Year card — not the configuration layout `<section>` that wraps the whole page. */
function yearCardByLabel(page: Page, label: string): Locator {
	return page.getByRole('heading', { name: label, exact: true }).locator('xpath=ancestor::section[1]');
}

function yearCards(page: Page): Locator {
	return page.locator('section.overflow-hidden.rounded-2xl');
}

async function expandYearSection(yearSection: Locator): Promise<void> {
	const section = yearSection.first();
	const body = section.locator(':scope > div.border-t');
	for (let attempt = 0; attempt < 3; attempt++) {
		if (await body.isVisible().catch(() => false)) {
			return;
		}
		await section.getByRole('button').first().click();
		try {
			await body.waitFor({ state: 'visible', timeout: 3_000 });
			return;
		}
		catch {
			await section.page().waitForTimeout(300);
		}
	}
}

/** Status badge lives on the section header — period rows also use Draft/Published labels. */
async function yearHeaderStatus(yearSection: Locator): Promise<'published' | 'draft' | 'archived' | 'unknown'> {
	const badge = yearSection.getByRole('button').first().locator('span.rounded-full').first();
	const badgeText = (await badge.innerText().catch(() => '')).toLowerCase().trim();
	if (/brouillon|draft/.test(badgeText)) {
		return 'draft';
	}
	if (/archiv[eé]e|archived/.test(badgeText)) {
		return 'archived';
	}
	if (/publi[eé]|published/.test(badgeText)) {
		return 'published';
	}
	return 'unknown';
}

const publishYearButtonName = /^publish year$|^publier l['’']année$/iu;
const archiveYearButtonName = /^archive year$|^archiver l['’']année$/iu;

async function confirmNamedDialog(page: Page, confirmButtonName: RegExp): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.waitFor({ state: 'visible', timeout: 10_000 });
	const confirm = dialog.getByRole('button', { name: confirmButtonName }).last();
	await waitForEnabled(confirm);
	await confirm.click();
	await waitForDialogClosed(page);
}

/** Archive published years so a draft year can be published (only one published year allowed). */
async function archivePublishedYears(page: Page): Promise<void> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const cards = yearCards(page);
		const count = await cards.count();
		let archived = false;
		for (let i = 0; i < count; i++) {
			const card = cards.nth(i);
			if ((await yearHeaderStatus(card)) !== 'published') {
				continue;
			}
			await expandYearSection(card);
			const archiveBtn = card.getByRole('button', { name: archiveYearButtonName }).first();
			if (!(await archiveBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
				continue;
			}
			await archiveBtn.click();
			await confirmNamedDialog(page, archiveYearButtonName);
			await waitForPageQuery(page);
			archived = true;
			break;
		}
		if (!archived) {
			return;
		}
	}
}

/**
 * Academic years are created as draft. Publish explicitly; archive any blocking published year first.
 */
export async function ensureAcademicYearReady(page: Page, label: string): Promise<boolean> {
	const yearSection = yearCardByLabel(page, label);
	await yearSection.waitFor({ state: 'visible', timeout: 20_000 });

	const readStatus = async () => yearHeaderStatus(yearSection);
	let status = await readStatus();
	if (status === 'published') {
		return true;
	}
	if (status === 'archived') {
		return false;
	}

	await archivePublishedYears(page);

	for (let attempt = 0; attempt < 8; attempt++) {
		await expandYearSection(yearSection);
		status = await readStatus();
		if (status === 'published') {
			return true;
		}

		const publishBtn = yearSection.getByRole('button', { name: publishYearButtonName }).first();
		const publishVisible = await publishBtn.isVisible({ timeout: 2_000 }).catch(() => false);
		const publishDisabled = publishVisible && await publishBtn.isDisabled().catch(() => false);
		console.log(`academic-year publish attempt ${attempt + 1}: status=${status} visible=${publishVisible} disabled=${publishDisabled}`);
		if (publishVisible) {
			if (publishDisabled) {
				await archivePublishedYears(page);
				await waitForPageQuery(page);
				continue;
			}
			await publishBtn.click();
			const responsePromise = page.waitForResponse(
				(response) => response.url().includes('/core/commands/publish-academic-year')
					&& response.request().method() === 'POST'
					&& response.status() < 400,
				{ timeout: 30_000 },
			).catch(() => null);
			await confirmNamedDialog(page, publishYearButtonName);
			await responsePromise;
			await waitForPageQuery(page);
			await page.waitForTimeout(500);
			if ((await readStatus()) === 'published') {
				return true;
			}
			// Header badge can lag shell refresh — archive button appears only on published years.
			const archiveInSection = yearSection.getByRole('button', { name: archiveYearButtonName });
			if (await archiveInSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
				return true;
			}
		}

		await page.waitForTimeout(1_000);
	}

	return (await readStatus()) === 'published';
}

/** @deprecated Use ensureAcademicYearReady */
export async function publishAcademicYearByLabel(page: Page, label: string): Promise<boolean> {
	return ensureAcademicYearReady(page, label);
}

/**
 * Matches list.rowActions / list.moreActions.
 * Must not match sidebar.show / sidebar.hide (bare `menu` did, and timed out behind drawer overlays).
 */
export const ACTION_MENU_BUTTON_NAME = /actions de ligne|row actions|plus d['’]?actions|more actions/i;

export const DELETE_CONTROL_NAME = /supprimer|delete|retirer|remove/i;

/** Draft announcement recipient row — not the overflow "Delete announcement" item. */
export const REMOVE_ANNOUNCEMENT_TARGET_CONTROL = /remove recipient|retirer le destinataire/i;

function deleteControlLocator(root: Page | Locator): Locator {
	return root.getByRole('button', { name: DELETE_CONTROL_NAME })
		.or(root.getByRole('menuitem', { name: DELETE_CONTROL_NAME }));
}

async function isDirectDeleteVisible(root: Page | Locator): Promise<boolean> {
	return deleteControlLocator(root).first().isVisible({ timeout: 1_500 }).catch(() => false);
}

async function openActionMenusForDelete(page: Page, root: Page | Locator): Promise<boolean> {
	const menus = root.getByRole('button', { name: ACTION_MENU_BUTTON_NAME });
	const count = await menus.count();
	for (let i = 0; i < count; i++) {
		const btn = menus.nth(i);
		if (!(await btn.isVisible().catch(() => false))) {
			continue;
		}
		const clicked = await btn.click({ timeout: 3_000 }).then(() => true).catch(() => false);
		if (!clicked) {
			continue;
		}
		// Overflow items are <button>s; bits-ui popovers portal to document.body.
		const visible = await deleteControlLocator(page).first().isVisible({ timeout: 2_000 }).catch(() => false);
		await page.keyboard.press('Escape').catch(() => {});
		if (visible) {
			return true;
		}
	}
	return false;
}

/** Provisioned runs assert delete affordance without clicking (no destructive mutation). */
export async function isDeleteControlVisible(page: Page): Promise<boolean> {
	const drawer = page.locator('aside[aria-label]').first();
	const scope = (await drawer.isVisible().catch(() => false)) ? drawer : page;

	if (await isDirectDeleteVisible(scope)) {
		return true;
	}
	return openActionMenusForDelete(page, scope);
}
