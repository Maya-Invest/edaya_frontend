import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { timetableFixtureConfig } from '../fixtures/timetable-modal/config';
import { createFixtureServer } from './support/fixture-server';

async function main() {
	ensurePlaywrightChromium();
	const server = await createFixtureServer(timetableFixtureConfig(), 'timetable-selection', 14179, '/timetable-fixture');
	let browser;
	try {
		browser = await chromium.launch({ headless: true });
		const page = await browser.newPage();
		await page.addInitScript(() => localStorage.setItem('lang', 'en'));
		page.setDefaultTimeout(15_000);
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => {
			pageErrors.push(error.message);
			console.error(error.stack);
		});
		await page.goto(server.url);
		const boxes = page.getByTestId('timetable-class-checkbox');
		const box = (id: string) => boxes.and(page.locator(`[data-class-id="${id}"]`));
		const classButton = (id: string) => page.getByTestId('timetable-workload-class').and(page.locator(`[data-class-id="${id}"]`));
		const editor = page.getByTestId('timetable-subject-editor');
		const submit = page.getByTestId('timetable-review-scope');
		const search = page.getByTestId('timetable-class-selection').getByRole('searchbox');
		async function activeClass(name: string) {
			await page.waitForFunction(value => document.querySelector('[data-testid="timetable-active-class"]')?.textContent?.trim() === value, name);
		}
		await boxes.first().waitFor();
		assert.equal(await page.getByTestId('timetable-class-selection').count(), 1);
		assert.equal(await page.getByRole('searchbox').count(), 1);
		assert.equal(await boxes.count(), 3);
		assert.equal(await page.getByTestId('timetable-workload-class').count(), 3);
		assert.deepEqual(await page.getByTestId('timetable-grade-count').allTextContents(), ['2/2', '1/1']);
		for (const box of await boxes.all()) assert(await box.isChecked());
		await activeClass('Class A');
		await classButton('b').focus();
		await page.keyboard.press('Enter');
		await activeClass('Class B');
		for (const box of await boxes.all()) assert(await box.isChecked(), 'Navigating must not toggle inclusion');
		const fields = editor.locator('input[type="number"]');
		await fields.nth(0).fill('7');
		await fields.nth(1).fill('2');
		await fields.nth(2).fill('3');
		await box('a').locator('..').click();
		assert(!(await box('a').isChecked()));
		await activeClass('Class B');
		assert(await classButton('a').isDisabled());
		await box('a').check();
		await box('c').focus();
		await page.keyboard.press('Space');
		assert(!(await box('c').isChecked()));
		await page.keyboard.press('Space');
		assert(await box('c').isChecked());
		await activeClass('Class B');
		if (process.env.TIMETABLE_SELECTION_SCREENSHOT)
			await page.screenshot({ path: process.env.TIMETABLE_SELECTION_SCREENSHOT });
		await search.fill('Class C');
		assert.equal(await boxes.count(), 1);
		await activeClass('Class B');
		assert.equal(await page.getByTestId('timetable-selection-count').textContent(), '3 of 3 selected');
		await page.getByTestId('timetable-clear-selection').click();
		assert(await submit.isDisabled());
		assert.equal(await page.getByTestId('timetable-selection-count').textContent(), '0 of 3 selected');
		assert.equal(await fields.count(), 0);
		await box('c').check();
		await activeClass('Class C');
		assert.equal(await page.getByTestId('timetable-selection-count').textContent(), '1 of 3 selected');
		await page.getByTestId('timetable-select-all').click();
		assert.equal(await page.getByTestId('timetable-selection-count').textContent(), '3 of 3 selected', 'Select all includes classes hidden by search');
		await search.fill('No matching class');
		assert.equal(await boxes.count(), 0);
		assert(await submit.isEnabled());
		await activeClass('Class C');
		await search.fill('Grade 1');
		assert.equal(await boxes.count(), 2);
		await classButton('b').click();
		await box('b').uncheck();
		await activeClass('Class C');
		assert.equal(await page.getByTestId('timetable-grade-count').textContent(), '1/2');
		await search.fill('');
		assert(await boxes.nth(0).isChecked());
		assert(!(await boxes.nth(1).isChecked()));
		assert(await boxes.nth(2).isChecked());
		assert.equal(await page.getByTestId('timetable-workload-class').count(), 3, 'Excluded classes stay available for re-inclusion');
		assert(await classButton('b').isDisabled());
		await classButton('a').click();
		await page.getByTestId('timetable-workload-periods').first().fill('4');
		await boxes.nth(0).uncheck();
		await boxes.nth(0).check();
		await page.getByTestId('timetable-workload-class').filter({ hasText: 'Class A' }).click();
		assert.equal(await page.getByTestId('timetable-workload-periods').first().inputValue(), '4');
		for (const tab of [1, 2]) {
			await page.getByRole('tab').nth(tab).click();
			assert.equal(await page.getByTestId('timetable-class-selection').count(), 0);
			assert(await submit.isEnabled(), 'Review remains available across settings panels');
		}
		await page.getByRole('tab').first().click();
		await activeClass('Class A');
		assert.equal(await fields.first().inputValue(), '4');
		await submit.click();
		assert.equal(await page.getByTestId('timetable-generate-submit').textContent(), 'Generate 2 classes');
		await page.getByTestId('timetable-generate-submit').click();
		assert.equal(await boxes.count(), 0, 'Selection controls must be hidden during generation');
		const requests = JSON.parse(await page.getByTestId('fixture-requests').textContent() ?? '[]');
		assert.deepEqual(requests[0].classGroupIds, ['c', 'a']);
		assert.equal(requests[0].periodsPerWeekByClassSubjectId['subject-a'], 4);
		assert.equal(requests[0].periodsPerWeekByClassSubjectId['subject-b'], undefined);
		assert.equal(requests[0].minPeriodSpanByClassSubjectId['subject-b'], undefined);
		assert.equal(requests[0].maxPeriodSpanByClassSubjectId['subject-b'], undefined);
		await page.getByTestId('fixture-finish').dispatchEvent('click');
		await page.getByRole('button', { name: /run again|relancer/i }).click();
		await page.getByTestId('task-step-selection').click();
		assert(await boxes.nth(0).isChecked());
		assert(!(await boxes.nth(1).isChecked()));
		assert.equal(await page.getByTestId('timetable-workload-periods').first().inputValue(), '4');
		await box('b').check();
		await classButton('b').click();
		assert.deepEqual(await fields.evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value)), ['7', '2', '3']);
		await page.getByTestId('fixture-year').dispatchEvent('click');
		await page.getByTestId('task-step-selection').click();
		await page.waitForFunction(() => document.querySelector('[data-testid="timetable-class-checkbox"]')?.getAttribute('data-class-id') === 'other-class');
		assert.equal(await boxes.count(), 1);
		assert(await boxes.first().isChecked());
		assert.equal(await page.getByTestId('timetable-workload-class').count(), 1);
		assert.equal(await fields.first().inputValue(), '');
		await boxes.first().uncheck();
		assert.equal(await fields.count(), 0);
		assert(await submit.isDisabled());
		await page.getByTestId('fixture-school').dispatchEvent('click');
		await page.getByTestId('task-step-selection').click();
		await page.waitForFunction(() => document.querySelector('[data-testid="timetable-class-checkbox"]')?.getAttribute('aria-checked') === 'true');
		await page.getByRole('button', { name: /close|fermer/i }).last().click();
		await page.getByTestId('fixture-open').click();
		assert(await boxes.first().isChecked());
		await page.getByTestId('fixture-empty').dispatchEvent('click');
		await page.waitForFunction(() => document.querySelectorAll('[data-testid="timetable-class-checkbox"]').length === 0);
		assert(await submit.isDisabled());
		assert.equal(await fields.count(), 0);
		assert((await editor.textContent())?.includes('No classes available'));

		const screenshots = process.env.TIMETABLE_SELECTION_SCREENSHOT_DIR;
		if (screenshots)
			mkdirSync(screenshots, { recursive: true });
		for (const [width, height, language, enlarged] of [
			[1440, 1000, 'en', false],
			[1440, 1000, 'fr', false],
			[390, 844, 'en', false],
			[390, 844, 'fr', false],
			[320, 700, 'fr', false],
			[768, 640, 'en', false],
			[1024, 540, 'fr', false],
			[1440, 1000, 'en', true],
			[1440, 1000, 'fr', true],
		] as const) {
			await page.setViewportSize({ width, height });
			await page.reload();
			await boxes.first().waitFor();
			await page.getByTestId(`fixture-${language}`).dispatchEvent('click');
			await page.getByTestId('fixture-many').dispatchEvent('click');
			await page.getByTestId('task-step-selection').click();
			await page.waitForFunction(() => document.querySelectorAll('[data-testid="timetable-class-checkbox"]').length === 80);
			if (enlarged)
				await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
			const dialog = page.getByTestId('form-modal');
			assert(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Dialog overflow at ${width}/${language}/${enlarged}`);
			assert(await page.getByTestId('timetable-class-options').evaluate(element => element.scrollHeight > element.clientHeight), 'Large class lists stay bounded');
			const footer = await submit.boundingBox();
			assert(footer && footer.y >= 0 && footer.y + footer.height <= height, `Footer clipped at ${width}/${language}/${enlarged}`);
			await classButton('many-0').scrollIntoViewIfNeeded();
			await classButton('many-0').click();
			await fields.first().scrollIntoViewIfNeeded();
			assert(await editor.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Editor overflow at ${width}/${language}/${enlarged}`);
			const input = await fields.first().boundingBox();
			assert(input && input.y >= 0 && input.y + input.height <= height, 'Subject settings remain reachable');
			if (screenshots)
				await page.screenshot({ path: join(screenshots, `${width}-${height}-${language}${enlarged ? '-200pct' : ''}.png`) });
		}
		assert.deepEqual(pageErrors, []);
		process.stdout.write('Timetable modal browser checks passed: consolidated grouping, independent inclusion/navigation, search, scoped overrides, empty/single/large lists, retries, scope reset, keyboard, FR/EN, responsive layouts and 200% text.\n');
	}
	finally {
		try {
			await browser?.close();
		}
		finally { await server.close(); }
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
