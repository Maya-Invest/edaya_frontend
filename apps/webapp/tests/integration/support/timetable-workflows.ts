import type { Page } from 'playwright';
import assert from 'node:assert/strict';
import { navigateSpaPage, waitForPageQuery, waitForResolvedAcademicYearId } from '../../../scripts/qa-harness-ui';
import { apiFetch } from '../setup/journey-api';

export async function exerciseTimetable(page: Page, base: string, verifyRegeneration: boolean): Promise<string> {
	await navigateSpaPage(page, `${base}/configuration/tools`);
	await waitForPageQuery(page);
	await waitForResolvedAcademicYearId(page);
	const year = await page.getByTestId('academic-year-trigger').getAttribute('data-year-id');
	assert(year, 'Required timetable academic year missing');
	const list = async () => {
		const rows: Array<Record<string, unknown>> = [];
		for (let offset = 0; offset < 10_000; offset += 100) {
			const response = await apiFetch(page, base, '/core/entities/lesson-sessions/list', {
				method: 'POST',
				data: { academicYearId: year, timetableGenerated: true, $limit: 100, $offset: offset, $orderBy: [{ field: 'id', direction: 'asc' }] },
				academicYearId: year,
			});
			assert(response.ok(), `Timetable read HTTP ${response.status()}`);
			const data = await response.json() as Array<Record<string, unknown>> | { items: Array<Record<string, unknown>> };
			const batch = Array.isArray(data) ? data : data.items;
			rows.push(...batch);
			if (batch.length < 100) return rows;
		}
		throw new Error('Timetable fixture exceeded the bounded pagination limit');
	};
	// Each scenario generates its own sessions. Repeating generation must replace
	// eligible lessons without accumulating duplicates or changing other classes.
	let firstSubjectCounts: string[] | undefined;
	for (let attempt = 0; attempt < (verifyRegeneration ? 2 : 1); attempt++) {
		await navigateSpaPage(page, `${base}/configuration/tools`);
		await page.getByTestId('timetable-planning-action').waitFor({ state: 'visible' });
		assert.equal(await page.getByTestId('timetable-publish-action').count(), 0);
		await page.getByTestId('timetable-planning-action').click();
		const dialog = page.getByRole('dialog');
		await dialog.waitFor({ state: 'visible' });
		const inputs = dialog.locator('input[type="date"]');
		const startDate = await inputs.nth(0).inputValue();
		const end = new Date(`${startDate}T12:00:00Z`);
		end.setUTCDate(end.getUTCDate() + 6);
		const endDate = end.toISOString().slice(0, 10);
		await inputs.nth(1).fill(endDate);
		await dialog.locator('form').getByRole('button', { name: /^(classes et paramètres|classes and settings)$/i }).click();
		await page.waitForURL(url => url.searchParams.get('taskStep') === 'selection');
		const checkboxes = dialog.getByTestId('timetable-class-checkbox');
		await checkboxes.first().waitFor({ state: 'visible' });
		const classIds = await checkboxes.evaluateAll(elements => elements.map(element => element.getAttribute('data-class-id')!));
		for (const checkbox of await checkboxes.all()) assert(await checkbox.isChecked(), 'All classes must start selected');
		await dialog.getByTestId('timetable-clear-selection').click();
		assert(await dialog.getByTestId('timetable-review-scope').isDisabled(), 'Empty selection must disable generation');
		await dialog.getByTestId('timetable-select-all').click();
		for (const checkbox of await checkboxes.all()) assert(await checkbox.isChecked(), 'Select all must restore every class');
		const selectedClassId = classIds[0]!;
		const classResponse = await apiFetch(page, base, `/core/entities/class-groups/${selectedClassId}`, { academicYearId: year });
		assert(classResponse.ok(), 'Selected timetable class must be readable');
		const classroom = await classResponse.json() as { academicYearId: string; schoolId: string };
		assert.equal(classroom.academicYearId, year, 'Lesson year scope comes from its persisted class');
		await dialog.getByTestId('timetable-clear-selection').click();
		await checkboxes.first().check();
		const beforeUnselected = (await list())
			.filter(row => row.classGroupId !== selectedClassId)
			.map(row => row.id)
			.sort();
		const selectionSearch = dialog.getByTestId('timetable-class-selection').getByTestId('list-search');
		await selectionSearch.fill('no-matching-timetable-class');
		assert(await dialog.getByTestId('timetable-review-scope').isEnabled(), 'Search must not clear the hidden selection');
		await selectionSearch.fill('');
		// Set a valid workload for every offered subject through the production form.
		await dialog.getByRole('tab', { name: /classes.*(?:matières|subjects)/i }).click();
		await dialog.getByTestId('timetable-workload-periods').first().waitFor({ state: 'visible', timeout: 20000 });
		for (const button of await dialog.getByTestId('timetable-workload-class').all()) {
			if (await button.getAttribute('data-class-id') === selectedClassId) {
				await button.click();
			} else {
				assert(await button.isDisabled(), 'Excluded classes must not expose editable workloads');
			}
		}
		for (const input of await dialog.getByTestId('timetable-workload-periods').all()) await input.fill('1');
		await dialog.getByRole('tab', { name: /avancé|advanced/i }).click();
		const allow = dialog.locator('label').filter({ hasText: /sans enseignant|unassigned/i }).first().getByRole('checkbox');
		await allow.check();
		const enforce = dialog.locator('label').filter({ hasText: /charge.*complète|workload.*fulfillment|respect.*volume|charge.*horaire/i }).first().getByRole('checkbox');
		if (await enforce.count())
			await enforce.uncheck();
		await dialog.getByTestId('timetable-review-scope').click();
		await page.waitForURL(url => url.searchParams.get('taskStep') === 'review');
		const responsePromise = page.waitForResponse(response => response.url().includes('/commands/generate-school-timetable') && response.request().method() === 'POST', { timeout: 60000 });
		await dialog.getByTestId('timetable-generate-submit').click();
		const response = await responsePromise;
		assert(response.ok(), `Timetable generation HTTP ${response.status()}: ${await response.text()}`);
		const request = response.request().postDataJSON();
		assert.deepEqual(request.classGroupIds, [selectedClassId], 'Generation must target only the selected class');
		assert.equal(request.academicYearId, year);
		assert.equal(request.startDate, startDate);
		assert.equal(request.endDate, endDate);
		await page.waitForURL(url => url.searchParams.get('taskStep') === 'success', { timeout: 60000 });
		const persistedSessions = await list();
		const generated = persistedSessions.filter(row => row.classGroupId === selectedClassId && String(row.startsAt).slice(0, 10) >= startDate && String(row.startsAt).slice(0, 10) <= endDate);
		assert(generated.length > 0, 'Generation must persist usable lesson sessions');
		assert(generated.every(row => row.schoolId === classroom.schoolId && row.timetableGenerated === true), 'Generated sessions must retain the selected school and generated flag');
		const result = await response.json() as { classGroups: { classGroupId: string; sessions: { id: string }[] }[] };
		assert.deepEqual(result.classGroups.map(row => row.classGroupId), [selectedClassId]);
		assert(result.classGroups[0]!.sessions.length > 0, 'Generation must return the created sessions');
		assert.equal(new Set(result.classGroups[0]!.sessions.map(row => row.id)).size, result.classGroups[0]!.sessions.length, 'Returned sessions must have distinct identities');
		const missing = result.classGroups[0]!.sessions.filter(row => !generated.some(saved => saved.id === row.id));
		assert.deepEqual(missing, [], `Every returned session must persist within ${selectedClassId}, ${startDate}–${endDate}; read ${persistedSessions.length} sessions, matched ${generated.length}`);
		assert.deepEqual((await list()).filter(row => row.classGroupId !== selectedClassId).map(row => row.id).sort(), beforeUnselected, 'Unselected class timetables must be unchanged');
		const subjectCounts: string[] = generated.map(row => String(row.classSubjectId)).sort();
		if (firstSubjectCounts) assert.deepEqual(subjectCounts, firstSubjectCounts, 'Regeneration must preserve the workload without accumulating duplicate lessons');
		firstSubjectCounts = subjectCounts;
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		const reloaded = await list();
		assert(generated.every(row => reloaded.some(saved => saved.id === row.id)), 'Every generated lesson must survive reload');
	}
	return verifyRegeneration
		? 'Generated and regenerated sessions persist after reload without duplicate workloads or changes to unselected classes'
		: 'Generated sessions persist after reload in the selected class, dates and academic year';
}
