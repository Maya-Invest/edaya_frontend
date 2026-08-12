import type { Locator, Page } from 'playwright';
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
	await page.getByText(/E2E 20\d\d-|20\d\d-\d{4}/i).first().waitFor({ state: 'visible', timeout: 5_000 });
}

export async function waitForDialogClosed(page: Page, timeout = 15_000): Promise<boolean> {
	const dialog = page.getByRole('dialog');
	try {
		await dialog.waitFor({ state: 'hidden', timeout });
		return true;
	}
	catch {
		return !(await dialog.isVisible().catch(() => false));
	}
}

function mainContentScope(page: Page): Locator {
	return page.locator('main, [role="main"]').first();
}

const LIST_SEARCH_PLACEHOLDER = /search|recherch/i;

/**
 * List-page search field — matches both `ListSearchField` (`type="search"`) and legacy
 * header snippets that use `<Input type="text">` + Search icon (e.g. teaching, subjects).
 */
export function listSearchInput(page: Page): Locator {
	const scope = mainContentScope(page);
	return scope
		.getByRole('searchbox')
		.or(scope.locator('input[type="search"]'))
		.or(scope.getByPlaceholder(LIST_SEARCH_PLACEHOLDER))
		.or(scope.locator('div.relative:has(svg) input[type="text"]'));
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

export async function submitDialog(
	page: Page,
	label: RegExp = /enregistrer|save changes|^save$/i,
): Promise<void> {
	const dialog = page.getByRole('dialog');
	const submit = dialog.getByRole('button', { name: label }).last();
	await waitForEnabled(submit);
	await submit.click();
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

export async function fillClassCreateDialog(
	page: Page,
	className: string,
): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').first().fill(className);
	const gradeSelect = await waitForGradeLevelSelectOptions(dialog);
	await gradeSelect.selectOption({ index: 0 });
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
export async function fillStudentCreateDialog(page: Page): Promise<void> {
	const dialog = page.getByRole('dialog');
	await dialog.locator('input').nth(0).fill('E2E');
	await dialog.locator('input').nth(1).fill(`Student${Date.now()}`);

	const noClasses = await dialog.getByText(/no classes|aucune classe|pas de classe/i).isVisible().catch(() => false);
	if (noClasses) {
		throw new Error('No classes in academicContext.hierarchy — create a class before adding a student');
	}

	const classTrigger = dialog.getByRole('combobox').first();
	if (await classTrigger.isVisible().catch(() => false)) {
		await classTrigger.click();
		await page.getByRole('option').first().click({ timeout: 10_000 });
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

const publishYearButtonName = /^publish year$|^publier l['']année$/iu;
const archiveYearButtonName = /^archive year$|^archiver l['']année$/iu;

/** Archive published years so a draft year can be published (only one published year allowed). */
async function archivePublishedYears(page: Page): Promise<void> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const archiveBtn = page.getByRole('button', { name: archiveYearButtonName }).first();
		if (!(await archiveBtn.isVisible().catch(() => false))) {
			return;
		}
		const section = page.locator('section').filter({ has: archiveBtn }).first();
		await expandYearSection(section);
		await archiveBtn.click();
		const dialog = page.getByRole('dialog');
		await dialog.waitFor({ state: 'visible', timeout: 10_000 });
		const confirm = dialog.getByRole('button', { name: archiveYearButtonName }).last();
		await waitForEnabled(confirm);
		await confirm.click();
		await waitForDialogClosed(page);
		await page.waitForTimeout(1_500);
	}
}

/**
 * Academic years are created as draft. Publish explicitly; archive any blocking published year first.
 */
export async function ensureAcademicYearReady(page: Page, label: string): Promise<boolean> {
	const yearSection = page.locator('section').filter({
		has: page.getByRole('heading', { name: label, exact: true }),
	}).first();
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

		const publishBtn = yearSection.getByRole('button', { name: publishYearButtonName });
		if (await publishBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
			if (await publishBtn.isDisabled().catch(() => false)) {
				await archivePublishedYears(page);
				await waitForPageQuery(page);
				continue;
			}
			await Promise.all([
				page.waitForResponse(
					(response) => response.url().includes('/core/commands/publish-academic-year')
						&& response.request().method() === 'POST'
						&& response.status() < 400,
					{ timeout: 30_000 },
				).catch(() => null),
				publishBtn.click(),
			]);
			await waitForPageQuery(page);
			await page.waitForTimeout(500);
			if ((await readStatus()) === 'published') {
				return true;
			}
			// Header badge can lag shell refresh — wait for archive action (published years only).
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
