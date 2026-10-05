import { captureScenarioPage } from '../../support/scenario-artifacts';
import assert from 'node:assert/strict';
import type { Browser } from 'playwright';
import { signIn } from '../support/auth';
import { CLASS_6A, OWNER_EMAIL, SEEDED_TIMETABLE_WEEK } from '../support/constants';
import { createDemoContext } from '../support/context';
import type { DemoReporter } from '../support/reporter';
import { visit } from '../support/visit';

/** Review cleanup surfaces in both dictionaries and at the existing mobile breakpoint. */
export async function runCleanupLayouts(browser: Browser, base: string, outDir: string, reporter: DemoReporter, errors: string[]) {
	const context = await browser.newContext();
	const page = await context.newPage();
	const ctx = createDemoContext(page, base, outDir, reporter, errors);
	const screens = [
		{ name: 'dashboard', path: '/dashboard', selector: 'main' },
		{ name: 'imports', path: '/configuration/tools?modal=import&modalTab=students&modalStep=upload', selector: '[role="dialog"]' },
		{ name: 'generation', path: '/configuration/tools?modal=generate-timetable', selector: '[role="dialog"]' },
		{ name: 'subjects', path: '/configuration/subjects', selector: 'main' },
		{ name: 'class-assignments', path: `/configuration/classes/${CLASS_6A}/assignments`, selector: 'aside[aria-label]' },
		{ name: 'report-definitions', path: '/configuration/report-cards', selector: 'main' },
		{ name: 'timetable', path: `/classes/${CLASS_6A}/timetable?week=${SEEDED_TIMETABLE_WEEK}`, selector: '.edaya-timetable-calendar' },
		{ name: 'finance', path: '/finance/billing', selector: 'main' },
		{ name: 'notifications', path: '/account/notifications', selector: 'main' },
	];
	try {
		await signIn(ctx, { email: OWNER_EMAIL });
		for (const language of ['fr', 'en']) {
			await page.evaluate(value => localStorage.setItem('lang', value), language);
			for (const width of [1440, 390]) {
				await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
				for (const screen of screens) {
					const step = `${screen.name}-${language}-${width}`;
					if (!await visit(ctx, `${base}${screen.path}`, 'Cleanup', step, { selector: screen.selector })) continue;
					try {
						assert.equal(await page.locator('html').getAttribute('lang'), language);
						await ctx.shot(`cleanup-${step}`);
					}
					catch (error) {
						await captureScenarioPage(page);
						reporter.log('Cleanup', `${step} language/capture`, 'fail', error instanceof Error ? error.message : String(error));
					}
				}
			}
		}
	}
	finally { await context.close(); }
}
