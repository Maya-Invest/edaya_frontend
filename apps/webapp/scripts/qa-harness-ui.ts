import { selectTrigger, chooseOption, selectControl } from '../tests/integration/support/custom-select';
import type { Locator, Page } from 'playwright';
import {
	academicYearLabelFromDates,
	defaultAcademicYearPreset,
} from '../src/lib/onboarding/school-step-defaults';
import { waitForEnabled } from '../tests/integration/demo-dry-run/support/auth';
import { waitForAppShell } from './qa-matrix-support';

export async function waitForPageQuery(page: Page): Promise<void> {
	const spinner = page.locator('[role="status"] .animate-spin');
	const visible = await spinner.first().isVisible().catch(() => false);
	if (!visible) {
		return;
	}
	await spinner.first().waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
}

const SPA_NAV_TIMEOUT_MS = 15_000;

/**
 * Wrangler SPA fallback can return HTML in milliseconds while deferred modules
 * never fire `domcontentloaded`/`load` (in-flight `/core` fetches). `commit`
 * ends the Playwright navigation; callers then wait on the shell.
 */
export async function navigateSpaPage(page: Page, target: string, timeout = SPA_NAV_TIMEOUT_MS): Promise<void> {
	try {
		await page.goto(target, { waitUntil: 'commit', timeout });
		return;
	}
	catch {
		await page.evaluate(() => window.stop()).catch(() => {});
	}
	await page.goto(target, { waitUntil: 'commit', timeout });
}

export async function dismissPageError(page: Page): Promise<void> {
	const retryBtn = page.getByRole('button', { name: /réessayer|retry/i });
	if (await retryBtn.isVisible().catch(() => false)) {
		await retryBtn.click();
		await waitForPageQuery(page);
	}
}

export async function refreshAppShell(page: Page, base: string): Promise<void> {
	await navigateSpaPage(page, `${base}/dashboard`);
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
		for (const key of Object.keys(sessionStorage)) {
			if (/^edaya:(yearId|periodId)(:|$)/.test(key)) sessionStorage.removeItem(key);
		}
	});
}

export async function waitForResolvedAcademicYearId(page: Page, timeout = 20_000): Promise<void> {
	await page.waitForFunction(() => {
		const trigger = document.querySelector('[data-testid="app-shell"]') ?? document.querySelector('[data-testid="academic-year-trigger"]');
		const schoolId = trigger?.getAttribute('data-school-id');
		const yearId = trigger?.getAttribute('data-year-id');
		return Boolean(schoolId && yearId && sessionStorage.getItem(`edaya:yearId:${schoolId}`) === yearId);
	}, undefined, { timeout });
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

/** Mutation dialogs close back to a still-open inspection drawer. */
export async function waitForDialogClosed(page: Page, timeout = 15_000): Promise<boolean> {
	try {
		await page.waitForFunction(() => !Array.from(document.querySelectorAll('[role="dialog"]:not(.ui-drawer)'))
			.some(node => node instanceof HTMLElement && node.checkVisibility()), undefined, { timeout });
		return true;
	}
	catch {
		return false;
	}
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
	const more = page.getByTestId('collection-menu');
	if (!(await more.isVisible().catch(() => false))) {
		return;
	}
	await more.click({ timeout: 3_000 }).catch(() => {});
	const tableView = page.getByRole('menuitem', { name: /vue tableau|table view/i });
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
	const more = page.getByTestId('collection-menu');
	if (!(await more.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return { status: 'na', detail: 'Menu Plus absent' };
	}

	await more.click({ timeout: 3_000 });

	const enterSelect = page.getByRole('menuitem', { name: /^(sélectionner|select)$/i });
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
	if (endpointLower.includes('/configuration/structure/subjects')) {
		push(/add subject|ajouter une matière/i);
	}
	if (endpointLower.includes('/configuration/grade-levels')) {
		push(/add grade level|ajouter un niveau/i);
	}
	if (endpointLower.includes('/configuration/structure/classes')) {
		push(/add class|ajouter une classe/i);
	}
	if (endpointLower.includes('/configuration/academic')) {
		push(/add academic year|ajouter une année scolaire/i);
	}
	if (endpointLower.includes('/configuration/other/subject-categories')) {
		push(/add category|ajouter une catégorie/i);
	}
	if (endpointLower.includes('/configuration/grade-scales')) {
		push(/add scale|ajouter un barème/i);
	}
	if (endpointLower.includes('/configuration/structure/details')) {
		push(/add model|ajouter un modèle/i);
	}
	if (endpointLower.includes('/school/family-feedback')) {
		push(/new campaign|nouvelle campagne|créer campagne|create campaign/i);
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
	if (/campagne|campaign/.test(actionLower)) {
		push(/new campaign|nouvelle campagne|créer campagne|create campaign/i);
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
	try {
		const foreground = page.getByRole('dialog').filter({ visible: true }).last();
		const root = scope ?? (await foreground.count() ? foreground : page);
		const btn = root.getByRole('button', { name }).or(page.getByRole('menuitem', { name })).filter({ visible: true }).first();
		const menu = root.getByTestId('collection-menu').first();
		await btn.or(menu).first().waitFor({ state: 'visible', timeout });
		if (!await btn.isVisible()) {
			await menu.click();
		}
		await btn.waitFor({ state: 'visible', timeout });
		await waitForEnabled(btn);
		await btn.click();
		await page.locator('[role="dialog"]:not(.ui-drawer)').last().waitFor({ state: 'visible', timeout: 10_000 });
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
	const dialog = modal.or(page.locator('[role="dialog"]:not(.ui-drawer)'));
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
	const dialog = page
		.locator('[data-testid="form-modal"], [data-testid="confirm-modal"], [data-testid="picker-modal"]')
		.or(page.locator('[role="dialog"]:not(.ui-drawer)'));
	try {
		await dialog.first().waitFor({ state: 'visible', timeout });
		// Let the dialog's scheduled autofocus complete before filling controls.
		await dialog.first().evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
		return true;
	} catch {
		return false;
	}
}

export async function confirmDialog(
	page: Page,
	label: RegExp = /rattacher|confirmer|confirm|ajouter|^add$|^ok$/i,
): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	const submit = dialog.getByTestId('picker-modal').getByRole('button', { name: label })
		.or(dialog.locator('[data-testid="confirm-modal"] button').filter({ hasText: label }))
		.or(dialog.getByRole('button', { name: label }).last());
	if (!(await submit.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return false;
	}
	if (await submit.isDisabled().catch(() => true)) {
		await waitForEnabled(submit).catch(() => {});
	}
	if (await submit.isDisabled().catch(() => true)) {
		return false;
	}
	await submit.click();
	return true;
}

export async function fillLabeledInput(
	page: Page,
	label: RegExp,
	value: string,
): Promise<boolean> {
	const dialog = page.getByRole('dialog').last();
	const field = dialog.getByLabel(label).first();
	if (await field.isVisible({ timeout: 1_500 }).catch(() => false)) {
		await field.fill(value);
		return true;
	}
	const labelNode = dialog.locator('label').filter({ hasText: label }).first();
	if (!(await labelNode.isVisible({ timeout: 3_000 }).catch(() => false))) {
		return false;
	}
	const wrapped = labelNode.locator('input, textarea').first();
	if (await wrapped.isVisible().catch(() => false)) {
		await wrapped.fill(value);
		return true;
	}
	const following = labelNode.locator('xpath=following::input[1] | following::textarea[1]');
	if (await following.isVisible().catch(() => false)) {
		await following.fill(value);
		return true;
	}
	return false;
}

export async function searchAndSelectPerson(page: Page, name: string): Promise<boolean> {
	const dialog = page.getByRole('dialog').last();
	const trigger = dialog.getByTestId('person-picker-trigger').first();
	if (!(await trigger.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true).catch(() => false))) {
		return false;
	}
	await trigger.click();
	const search = page.locator('[data-person-picker-search] input:visible').last();
	await search.waitFor({ state: 'visible' });
	if (name) await search.fill(name);
	const anyOption = page.getByRole('option').filter({ visible: true }).first();
	const named = page.getByRole('option', { name: new RegExp(name, 'i') }).filter({ visible: true }).first();
	if (await named.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false)) {
		await named.click();
		return true;
	}
	if (name) {
		await page.keyboard.press('Escape');
		throw new Error('Required named person fixture was not available in the picker');
	}
	if (await search.isVisible().catch(() => false)) {
		await search.fill('');
	}
	if (await anyOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await anyOption.click();
		return true;
	}
	await page.keyboard.press('Escape').catch(() => {});
	return false;
}

export async function fillPaymentDialog(page: Page): Promise<void> {
	const dialog = page.getByRole('dialog');
	const amount = dialog.getByLabel(/amount|montant/i).or(dialog.locator('input[type="number"]').first());
	if (await amount.isVisible({ timeout: 5_000 }).catch(() => false)) {
		const current = await amount.inputValue().catch(() => '');
		if (!current || current === '0') {
			await amount.fill('1000');
		}
	}
	const date = dialog.getByLabel(/date|payment date|date de paiement/i).or(dialog.locator('input[type="date"]').first());
	if (await date.isVisible().catch(() => false)) {
		const current = await date.inputValue().catch(() => '');
		if (!current) {
			await date.fill(new Date().toISOString().slice(0, 10));
		}
	}
	await waitForSubmitEnabled(page);
}

export async function selectNativeFilter(
	page: Page,
	nth: number,
	option: { value?: string; label?: RegExp } = {},
): Promise<boolean> {
	const select = page.getByRole('dialog').locator('select[data-select-value]').nth(nth);
	if (!(await selectTrigger(select).isVisible({ timeout: 8_000 }).catch(() => false))) {
		return false;
	}
	if (option.value) {
		await chooseOption(select, option.value);
		return true;
	}
	const values = await select.locator('option').evaluateAll((nodes) => (
		nodes
			.map(node => ({
				value: (node as HTMLOptionElement).value,
				label: node.textContent ?? '',
			}))
			.filter(entry => entry.value.length > 0)
	));
	const match = option.label
		? values.find(entry => option.label?.test(entry.label))
		: values[0];
	if (!match) {
		return false;
	}
	await chooseOption(select, match.value);
	return true;
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
	await navigateSpaPage(page, url.toString());
	await waitForAppShell(page);
	await waitForPageQuery(page);
	await dismissPageError(page);
	return waitForFormModal(page, options.timeout ?? 12_000);
}

export async function pickFirstPerson(page: Page): Promise<boolean> {
	return searchAndSelectPerson(page, '');
}

/** Click every combobox in the open dialog and pick an option (last = newest list item). */
export async function pickDialogComboboxes(page: Page, preferLast = false): Promise<number> {
	const dialog = page.getByRole('dialog');
	const combos = selectControl(dialog);
	const count = await combos.count();
	let picked = 0;
	for (let i = 0; i < count; i++) {
		const trigger = combos.nth(i);
		if (!(await trigger.isVisible().catch(() => false))) {
			continue;
		}
		await trigger.click();
		const options = page.getByRole('option');
		const optionCount = await options.count();
		if (optionCount === 0) {
			await page.keyboard.press('Escape').catch(() => {});
			continue;
		}
		await (preferLast ? options.nth(optionCount - 1) : options.first()).click();
		picked += 1;
	}
	return picked;
}

/** Click one dialog select and pick a named option, else the first option. */
export async function pickDialogComboboxOption(
	page: Page,
	optionName?: string | RegExp,
	nth = 0,
): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	const trigger = dialog.locator('button[role="combobox"], button[aria-haspopup="listbox"]').nth(nth);
	if (!(await trigger.isVisible({ timeout: 8_000 }).catch(() => false))) {
		const labels = await dialog.getByRole('button').allTextContents().catch(() => []);
		console.log(`dialog select missing; buttons: ${labels.join(' | ') || '(none)'}`);
		return false;
	}
	await trigger.click();
	const options = page.locator('[role="option"]:visible');
	if (!(await options.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
		const labels = await page.getByRole('option').allTextContents().catch(() => []);
		console.log(`dialog select options: ${labels.join(' | ') || '(none)'}`);
		await page.keyboard.press('Escape').catch(() => {});
		return false;
	}
	if (optionName) {
		const named = options.filter({
			hasText: optionName instanceof RegExp ? optionName : new RegExp(optionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
		}).first();
		if (await named.isVisible({ timeout: 4_000 }).catch(() => false)) {
			await named.click();
			return true;
		}
	}
	await options.first().click();
	return true;
}

/** Serialization proxies for custom filter controls; interaction uses their visible triggers. */
export const LIST_FILTER_NATIVE_LOCATOR
	= '[data-select-field]:has([data-testid="list-filter-select"]) select[data-select-value]';

export async function selectListFilter(page: Page, value: string): Promise<boolean> {
	const native = page.locator(LIST_FILTER_NATIVE_LOCATOR).first();
	if (!await selectTrigger(native).isVisible()) await page.getByTestId('collection-filter').first().click();
	if (await selectTrigger(native).isVisible({ timeout: 4_000 }).catch(() => false)) {
		await chooseOption(native, value);
		return true;
	}
	const combobox = selectControl(page).first();
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
	const inMain = page.locator('main').getByText(text, { exact: false });
	const anywhere = page.getByText(text, { exact: false });
	const row = (visible
		? inMain.filter({ visible: true }).first().or(anywhere.filter({ visible: true }).first())
		: inMain.first().or(anywhere.first())).first();
	try {
		await row.waitFor({ state: visible ? 'visible' : 'hidden', timeout });
		return true;
	}
	catch {
		return false;
	}
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
	await selectTrigger(gradeSelect).waitFor({ state: 'visible', timeout });
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

/** GradeLevelFormModal — name and short name are required. */
export async function fillGradeLevelCreateDialog(page: Page, levelName: string): Promise<void> {
	const dialog = page.getByRole('dialog');
	const nameInput = dialog.getByRole('textbox', { name: /^(grade level name|nom du niveau)$/i });
	const shortNameInput = dialog.getByRole('textbox', { name: /^(short name|nom court)$/i });
	const submit = dialog.getByRole('button', { name: /enregistrer|save changes|^save$/i }).last();

	await nameInput.waitFor({ state: 'visible', timeout: 15_000 });

	const fillFields = async () => {
		await nameInput.fill(levelName);
		await shortNameInput.fill(levelName);
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
			const responsePromise = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/configure-grade-level'), { timeout: 20_000 });
			await submit.click();
			const response = await responsePromise;
			const body = await response.json().catch(() => null);
			if (!response.ok() || body?.success === false || body?.error)
				throw new Error(`Grade level creation rejected (HTTP ${response.status()})`);
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
	expectedGradeLevelId?: string,
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').first().fill(className);
	const gradeSelect = await waitForGradeLevelSelectOptions(dialog);
	if (await gradeSelect.isEnabled()) {
		await chooseOption(gradeSelect, expectedGradeLevelId ? { value: expectedGradeLevelId } : { index: 0 });
	}
	const selectedGradeLevelId = await gradeSelect.inputValue();
	if (!selectedGradeLevelId || (expectedGradeLevelId && selectedGradeLevelId !== expectedGradeLevelId)) {
		throw new Error('Class creation must retain the selected structure grade level');
	}
	const attendanceSelect = dialog.locator('select').filter({
		has: page.locator('option[value="daily"]'),
	}).last();
	if (await selectTrigger(attendanceSelect).isVisible().catch(() => false)) {
		await chooseOption(attendanceSelect, 'daily');
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
	await dialog.getByRole('textbox', { name: /^(first name|prénom)$/i }).fill(firstName);
	await dialog.getByRole('textbox', { name: /^(last name|nom)$/i }).fill(lastName);

	const noClasses = await dialog.getByText(/no classes|aucune classe|pas de classe/i).isVisible().catch(() => false);
	if (noClasses) {
		throw new Error('No classes in academicContext.hierarchy — create a class before adding a student');
	}

	const classTrigger = selectControl(dialog).first();
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
	await dialog.getByRole('textbox', { name: /^(first name|prénom)$/i }).fill(options.firstName ?? 'E2E');
	await dialog.getByRole('textbox', { name: /^(last name|nom)$/i }).fill(options.lastName ?? `Person${Date.now()}`);

	const invite = dialog.locator('#staff-send-invite, #teacher-send-invite, #guardian-send-invite, [id$="-send-invite"]');
	await invite.first().waitFor({ state: 'visible', timeout: 15_000 });
	await invite.first().setChecked(false);
	if (await invite.first().isChecked()) {
		throw new Error('Person create invitation toggle did not become unchecked');
	}

	await submitDialog(page);
}

/** Staff / teacher / guardian create — keep invite on and fill email. */
export async function fillPersonCreateDialogWithInvite(
	page: Page,
	options: { email: string; firstName?: string; lastName?: string },
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.getByRole('textbox', { name: /^(first name|prénom)$/i }).fill(options.firstName ?? 'E2E');
	await dialog.getByRole('textbox', { name: /^(last name|nom)$/i }).fill(options.lastName ?? `Person${Date.now()}`);

	const invite = dialog.locator('#staff-send-invite, #teacher-send-invite, #guardian-send-invite, [id$="-send-invite"]');
	const count = await invite.count();
	for (let i = 0; i < count; i++) {
		const box = invite.nth(i);
		if (await box.isVisible().catch(() => false) && !(await box.isChecked().catch(() => false))) {
			await box.click();
		}
	}

	await dialog.locator('input[type="email"]').first().fill(options.email);

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
		await navigateSpaPage(page, `${base}${timetablePath}`);
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
		const subjectTrigger = selectControl(dialog).first()
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
 _classId: string,
 studentName?: string,
): Promise<string | null> {
 const rows = page.locator('main tr');
 const scope = studentName ? rows.filter({ hasText: studentName }) : rows;
 const rowMenu = scope.getByRole('button', { name: ACTION_MENU_BUTTON_NAME }).first();
 await rowMenu.click();
 const button = page.getByRole('menuitem', { name: /^(generate|générer)$/i }).first();
 await button.waitFor({ state: 'visible', timeout: 20000 });
 const response = page.waitForResponse(result => result.request().method() === 'POST' && result.url().includes('/core/commands/generate-report-card-result'), { timeout: 30000 });
 await button.click();
 const generated = await response;
 if (!generated.ok()) throw new Error(`Report generation HTTP ${generated.status()}`);
 const body = await generated.json() as { id?: string };
 if (!body.id) throw new Error('Report generation returned no result ID');
 await scope.locator('.ui-record-target').waitFor({ state: 'visible' });
 return body.id;
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

/** Report-card model creation inherits the grade-level scale. */
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

	if (await selectTrigger(gradeSelect).isVisible().catch(() => false)) {
		if (!(await waitForSelectOptionCount(gradeSelect, 1))) {
			throw new Error('Report-card grade level select has no options');
		}
		if (options.gradeLevelId) {
			await chooseOption(gradeSelect, options.gradeLevelId).catch(() => chooseOption(gradeSelect, { index: 0 }));
		}
		else {
			await chooseOption(gradeSelect, { index: 0 });
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

export async function fillIncidentTitle(page: Page, title: string): Promise<boolean> {
	const dialog = page.getByRole('dialog').last();
	const titled = dialog.locator('#incident-title, [data-testid="incident-title-input"]').first();
	if (await titled.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await titled.fill(title);
		await titled.evaluate((element, nextTitle) => {
			if (!(element instanceof HTMLInputElement)) {
				return;
			}
			element.value = nextTitle;
			element.dispatchEvent(new Event('input', { bubbles: true }));
			element.dispatchEvent(new Event('change', { bubbles: true }));
		}, title);
		return true;
	}
	if (await fillLabeledInput(page, /^title$|^titre$/i, title)) {
		return true;
	}
	const fallback = dialog.locator('input:not([type="date"]):not([type="search"]):not([type="time"]):not([type="number"])').first();
	if (await fallback.isVisible().catch(() => false)) {
		await fallback.fill(title);
		return true;
	}
	return false;
}

export async function fillIncidentCreateDialog(
	page: Page,
	options: { title: string; description?: string; studentName?: string } = { title: 'E2E-Incident' },
): Promise<void> {
	const dialog = page.getByRole('dialog');
	if (!await fillIncidentTitle(page, options.title)) {
		await dialog.locator('input:not([type="date"]):not([type="search"]):not([type="time"])').first().fill(options.title);
	}
	const textarea = dialog.locator('textarea').first();
	if (await textarea.isVisible().catch(() => false)) {
		await textarea.fill(options.description ?? 'E2E incident description');
	}
	if (options.studentName) {
		await searchAndSelectPerson(page, options.studentName);
	}
	else if (!(await waitForSubmitEnabled(page, 2_000))) {
		await pickFirstPerson(page);
	}
	await waitForSubmitEnabled(page);
}

export async function fillFeeCreateDialog(
	page: Page,
	feeName: string,
	amount = '10000',
): Promise<void> {
	const dialog = page.getByRole('dialog');
	const nameInput = dialog.getByLabel(/fee name|nom du frais/i)
		.or(dialog.getByRole('textbox').first());
	await nameInput.fill(feeName);
	const amountInput = dialog.getByLabel(/amount|montant/i)
		.or(dialog.locator('input[type="number"]').first());
	await amountInput.fill(amount);
	await amountInput.evaluate((element, nextAmount) => {
		if (!(element instanceof HTMLInputElement)) {
			return;
		}
		element.value = nextAmount;
		element.dispatchEvent(new Event('input', { bubbles: true }));
		element.dispatchEvent(new Event('change', { bubbles: true }));
	}, amount);
}

export async function fillAssignFeeDialog(page: Page, studentName?: string): Promise<boolean> {
	if (studentName) {
		if (!await searchAndSelectPerson(page, studentName)) return false;
		return waitForSubmitEnabled(page);
	}
	if (await waitForSubmitEnabled(page, 8_000)) {
		return true;
	}
	await pickFirstPerson(page);
	const feeCombo = selectControl(page.getByRole('dialog')).first();
	if (await feeCombo.isVisible().catch(() => false)) {
		await selectComboboxOption(page, feeCombo);
	}
	return waitForSubmitEnabled(page);
}

export async function fillEvaluationCreateDialog(page: Page, title: string, classSubjectId?: string): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	const empty = await dialog.getByText(/aucune|empty|no (subject|matière)/i).isVisible().catch(() => false);
	if (empty) {
		return false;
	}
	const titleInput = dialog.locator('input:not([type="number"]):not([type="date"])').first();
	await titleInput.waitFor({ state: 'visible', timeout: 8_000 });
	// Newly registered students are not eligible for a 09:00 assessment earlier today.
	// Schedule this mutable fixture after enrollment, inside the current academic period.
	if (classSubjectId) {
		await dialog.getByTestId('assessment-subject-select').click();
		await page.getByTestId(`assessment-subject-${classSubjectId}`).click();
	}
	const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	await dialog.locator('input[type="date"]').fill(tomorrow);
	const started = Date.now();
	while (Date.now() - started < 12_000) {
		await titleInput.fill(title);
		if (await waitForSubmitEnabled(page, 400)) {
			return true;
		}
		await page.waitForTimeout(250);
	}
	const subjectCombo = selectControl(dialog).nth(1);
	if (await subjectCombo.isVisible().catch(() => false)) {
		await selectComboboxOption(page, subjectCombo);
	}
	await titleInput.fill(title);
	return waitForSubmitEnabled(page);
}

/** Year card — not the configuration layout `<section>` that wraps the whole page. */
function yearCardByLabel(page: Page, label: string): Locator {
	return page.getByRole('heading', { name: label, exact: true }).first().locator('xpath=ancestor::section[1]');
}

function yearCards(page: Page): Locator {
	return page.locator('section').filter({ has: page.locator('[data-academic-menu]') }).filter({ has: page.locator(':scope > div > button[aria-expanded]') });
}

async function openYearActions(yearSection: Locator): Promise<void> {
	await yearSection.locator('[data-academic-menu]').first().getByRole('button').click();
	await yearSection.page().getByRole('menu').waitFor({ state: 'visible' });
}

async function expandYearSection(yearSection: Locator): Promise<void> {
	const section = yearSection.first();
	const body = section.locator(':scope > div.border-t');
	for (let attempt = 0; attempt < 3; attempt++) {
		if (await body.isVisible().catch(() => false)) {
			return;
		}
		const clicked = await section.getByRole('button').first().click({ timeout: 5_000 }).then(() => true).catch(() => false);
		if (!clicked) {
			return;
		}
		try {
			await body.waitFor({ state: 'visible', timeout: 3_000 });
			return;
		}
		catch {
			await section.page().waitForTimeout(300);
		}
	}
}

async function dismissAcademicYearModals(page: Page): Promise<void> {
	await dismissOpenDialogs(page);
	const url = new URL(page.url());
	if (!url.searchParams.has('modal')) {
		return;
	}
	url.searchParams.delete('modal');
	url.searchParams.delete('modalTarget');
	url.searchParams.delete('modalStep');
	await navigateSpaPage(page, url.toString());
	await waitForPageQuery(page);
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

async function confirmNamedDialog(page: Page, confirmButtonName: RegExp): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	const visible = await dialog.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
	if (!visible) {
		return false;
	}
	const confirm = dialog.getByRole('button', { name: confirmButtonName }).last();
	await waitForEnabled(confirm);
	await confirm.click();
	return waitForDialogClosed(page);
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
			await openYearActions(card);
			const archiveBtn = page.getByRole('menu').getByRole('menuitem', { name: archiveYearButtonName }).first();
			if (!(await archiveBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
				continue;
			}
			await archiveBtn.click({ timeout: 8_000 }).catch(() => {});
			await confirmNamedDialog(page, archiveYearButtonName);
			await dismissAcademicYearModals(page);
			await waitForPageQuery(page);
			archived = true;
			break;
		}
		if (!archived) {
			return;
		}
	}
}

async function academicYearUiLooksPublished(yearSection: Locator): Promise<boolean> {
	return (await yearHeaderStatus(yearSection)) === 'published';
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

	await dismissAcademicYearModals(page);
	await archivePublishedYears(page);

	for (let attempt = 0; attempt < 3; attempt++) {
		await dismissAcademicYearModals(page);
		await expandYearSection(yearSection);
		status = await readStatus();
		if (status === 'published') {
			return true;
		}

		await openYearActions(yearSection);
		const publishBtn = page.getByRole('menu').getByRole('menuitem', { name: publishYearButtonName }).first();
		const publishVisible = await publishBtn.isVisible({ timeout: 2_000 }).catch(() => false);
		const publishDisabled = publishVisible && await publishBtn.isDisabled().catch(() => false);
		console.log(`academic-year publish attempt ${attempt + 1}: status=${status} visible=${publishVisible} disabled=${publishDisabled}`);
		if (publishVisible) {
			if (publishDisabled) {
				await archivePublishedYears(page);
				await waitForPageQuery(page);
				continue;
			}
			const clicked = await publishBtn.click({ timeout: 8_000 }).then(() => true).catch(() => false);
			if (!clicked) {
				console.log('academic-year publish button click blocked (overlay)');
				continue;
			}
			const responsePromise = page.waitForResponse(
				(response) => response.url().includes('/core/commands/publish-academic-year')
					&& response.request().method() === 'POST',
				{ timeout: 15_000 },
			).catch(() => null);
			await confirmNamedDialog(page, publishYearButtonName);
			const publishResponse = await responsePromise;
			if (publishResponse) {
				console.log(`academic-year publish response: status=${publishResponse.status()}`);
				if (publishResponse.status() >= 400) {
					console.log(
						`academic-year publish body: ${(await publishResponse.text().catch(() => '')).slice(0, 400)}`,
					);
				}
			}
			await waitForPageQuery(page);
			await page.waitForTimeout(500);
			if (await academicYearUiLooksPublished(yearSection)) {
				return true;
			}
		}

		await page.waitForTimeout(500);
	}

	if ((await readStatus()) === 'published') {
		return true;
	}

	throw new Error(`Academic-year UI publication did not persist for ${label}`);
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

/** Billing fees are cancelled, not deleted — must not match FormModal "Cancel" / "Annuler". */
export const BILLING_CANCEL_CONTROL_NAME = /annuler la facture|cancel fee/i;

/** Draft announcement recipient row — not the overflow "Delete announcement" item. */
export const REMOVE_ANNOUNCEMENT_TARGET_CONTROL = /remove recipient|retirer le destinataire/i;

function deleteControlLocator(root: Page | Locator): Locator {
	return root.getByRole('button', { name: DELETE_CONTROL_NAME })
		.or(root.getByRole('menuitem', { name: DELETE_CONTROL_NAME }))
		.or(root.getByRole('button', { name: BILLING_CANCEL_CONTROL_NAME }))
		.or(root.getByRole('menuitem', { name: BILLING_CANCEL_CONTROL_NAME }));
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
	const drawer = page.locator('[role="dialog"].ui-drawer').first();
	const scope = (await drawer.isVisible().catch(() => false)) ? drawer : page;

	if (await isDirectDeleteVisible(scope)) {
		return true;
	}
	return openActionMenusForDelete(page, scope);
}
