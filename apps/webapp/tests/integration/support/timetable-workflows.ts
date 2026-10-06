import type { Page } from 'playwright';
import assert from 'node:assert/strict';
import { navigateSpaPage, waitForPageQuery, waitForResolvedAcademicYearId } from '../../../scripts/qa-harness-ui';
import { apiFetch } from '../setup/journey-api';

export async function exerciseTimetable(page: Page, base: string, publish: boolean): Promise<string> {
	await navigateSpaPage(page, `${base}/configuration/tools`);
	await waitForPageQuery(page);
	await waitForResolvedAcademicYearId(page);
	const year = await page.getByTestId('academic-year-trigger').getAttribute('data-year-id');
	assert(year, 'Required timetable academic year missing');
	const list = async (status: string) => {
		const response = await apiFetch(page, base, '/core/entities/lesson-sessions/list', {
			method: 'POST',
			data: { academicYearId: year, timetableGenerated: status },
			academicYearId: year,
		});
		assert(response.ok(), `Timetable read HTTP ${response.status()}`);
		const data = await response.json() as Array<Record<string, unknown>> | { items: Array<Record<string, unknown>> };
		return (Array.isArray(data) ? data : data.items) as Array<Record<string, unknown>>;
	};
	// Each scenario generates its own draft; publishing never depends on another scenario.
	await page.getByTestId('timetable-planning-action').click();
	let dialog = page.getByRole('dialog');
	await dialog.waitFor({ state: 'visible' });
	const inputs = dialog.locator('input[type="date"]');
	const startDate = await inputs.nth(0).inputValue();
	const end = new Date(`${startDate}T12:00:00Z`);
	end.setUTCDate(end.getUTCDate() + 6);
	const endDate = end.toISOString().slice(0, 10);
	await inputs.nth(1).fill(endDate);
	const checkboxes = dialog.getByTestId('timetable-class-checkbox');
	await checkboxes.first().waitFor({ state: 'visible' });
	const classIds = await checkboxes.evaluateAll(elements => elements.map(element => element.getAttribute('data-class-id')!));
	for (const checkbox of await checkboxes.all()) assert(await checkbox.isChecked(), 'All classes must start selected');
	await dialog.getByTestId('timetable-clear-selection').click();
	assert(await dialog.getByTestId('timetable-generate-submit').isDisabled(), 'Empty selection must disable generation');
	await dialog.getByTestId('timetable-select-all').click();
	for (const checkbox of await checkboxes.all()) assert(await checkbox.isChecked(), 'Select all must restore every class');
	const selectedClassId = classIds[0]!;
	await dialog.getByTestId('timetable-clear-selection').click();
	await checkboxes.first().check();
	const beforeUnselected = [...await list('draft'), ...await list('published')]
		.filter(row => row.classGroupId !== selectedClassId)
		.map(row => row.id)
		.sort();
	const selectionSearch = dialog.getByTestId('timetable-class-selection').getByTestId('list-search');
	await selectionSearch.fill('no-matching-timetable-class');
	assert(await dialog.getByTestId('timetable-generate-submit').isEnabled(), 'Search must not clear the hidden selection');
	await selectionSearch.fill('');
	// Set a valid workload for every offered subject through the production form.
	await dialog.getByRole('tab', { name: /classes.*(?:matières|subjects)/i }).click();
	await dialog.getByTestId('timetable-workload-periods').first().waitFor({ state: 'visible', timeout: 20000 });
	const classes = dialog.getByTestId('timetable-workload-class');
	const fillWorkload = async () => {
		for (const input of await dialog.getByTestId('timetable-workload-periods').all()) await input.fill('1');
	};
	if (await classes.count()) {
		for (const button of await classes.all()) {
			const label = (await button.textContent() ?? '').trim();
			await button.click();
			await dialog.locator('section').getByText(label, { exact: true }).first().waitFor({ state: 'visible' });
			await fillWorkload();
		}
	}
	else {
		await fillWorkload();
	}
	await dialog.getByRole('tab', { name: /avancé|advanced/i }).click();
	const allow = dialog.locator('label').filter({ hasText: /sans enseignant|unassigned/i }).first().getByRole('checkbox');
	await allow.check();
	const enforce = dialog.locator('label').filter({ hasText: /charge.*complète|workload.*fulfillment|respect.*volume|charge.*horaire/i }).first().getByRole('checkbox');
	if (await enforce.count())
		await enforce.uncheck();
	const responsePromise = page.waitForResponse(response => response.url().includes('/commands/generate-class-group-timetable') && response.request().method() === 'POST', { timeout: 60000 });
	await dialog.getByTestId('timetable-generate-submit').click();
	const response = await responsePromise;
	assert(response.ok(), `Timetable generation HTTP ${response.status()}: ${await response.text()}`);
	assert.equal(response.request().postDataJSON().classGroupId, selectedClassId, 'Generation must target the selected class');
	await page.waitForURL(url => url.searchParams.get('modalStep') === 'success', { timeout: 60000 });
	const drafts = (await list('draft')).filter(row => row.classGroupId === selectedClassId && String(row.startsAt).slice(0, 10) >= startDate && String(row.startsAt).slice(0, 10) <= endDate);
	assert(drafts.length > 0, 'Generation must persist draft lesson sessions');
	assert.deepEqual([...await list('draft'), ...await list('published')].filter(row => row.classGroupId !== selectedClassId).map(row => row.id).sort(), beforeUnselected, 'Unselected class timetables must be unchanged');
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert((await list('draft')).some(row => row.id === drafts[0]!.id), 'Draft must survive reload');
	if (!publish)
		return 'Generated draft sessions persist after reload';
	await navigateSpaPage(page, `${base}/configuration/tools`);
	await page.getByTestId('timetable-publish-action').click();
	dialog = page.getByRole('dialog');
	await dialog.locator('input[type="date"]').nth(0).fill(startDate);
	await dialog.locator('input[type="date"]').nth(1).fill(endDate);
	await dialog.locator('select').selectOption('skip');
	const publishedResponse = page.waitForResponse(response => response.url().includes('/commands/publish-class-group-timetable') && response.request().method() === 'POST', { timeout: 60000 });
	await dialog.getByRole('button', { name: /^(publier|publish)$/i }).click();
	const published = await publishedResponse;
	assert(published.ok(), `Timetable publication HTTP ${published.status()}: ${await published.text()}`);
	await page.waitForURL(url => url.searchParams.get('modalStep') === 'result');
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const rows = await list('published');
	assert(rows.some(row => drafts.some(draft => draft.id === row.id)), 'Published sessions must persist after reload');
	return 'Generated and published timetable sessions persist after reload';
}
