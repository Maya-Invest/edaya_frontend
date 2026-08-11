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

export async function openDialogButton(
	page: Page,
	name: RegExp,
	timeout = 20_000,
): Promise<boolean> {
	const btn = page.getByRole('button', { name }).first();
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
	await submitDialog(page);
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

	const submit = dialog.getByRole('button', { name: /nouvel élève|créer|create|enregistrer|save/i }).last();
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

async function yearHeaderStatus(yearSection: Locator): Promise<'published' | 'draft' | 'archived' | 'unknown'> {
	const text = (await yearSection.first().innerText().catch(() => '')).toLowerCase();
	// Draft before published: expanded sections include a "Publier l'année" action button.
	if (/brouillon|draft/.test(text)) {
		return 'draft';
	}
	if (/archiv[eé]e|archived/.test(text)) {
		return 'archived';
	}
	if (/publi[eé]|published/.test(text)) {
		return 'published';
	}
	return 'unknown';
}

const publishYearButtonName = /^publier l'année$|^publish year$/i;
const archiveYearButtonName = /^archiver l'année$|^archive year$/i;

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
				continue;
			}
			await publishBtn.click();
			await page.waitForTimeout(1_500);
			await waitForPageQuery(page);
			if ((await readStatus()) === 'published') {
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
