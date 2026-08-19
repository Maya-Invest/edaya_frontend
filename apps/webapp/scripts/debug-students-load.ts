#!/usr/bin/env bun
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { runWebTenantSetup } from '../tests/integration/setup/web-tenant-setup';
import { createDemoContext } from '../tests/integration/demo-dry-run/support/context';
import { DemoReporter } from '../tests/integration/demo-dry-run/support/reporter';

const FIXTURE = path.join(import.meta.dirname, '..', '.integration-run', 'fixture.json');
const base = 'http://localhost:5173';

async function main(): Promise<void> {
	const fixture = JSON.parse(await readFile(FIXTURE, 'utf8')) as { email: string; password: string };
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const failed: string[] = [];
	page.on('response', async (res) => {
		if (res.status() >= 400 && res.url().includes('localhost')) {
			const body = await res.text().catch(() => '');
			failed.push(`${res.status()} ${res.request().method()} ${res.url()} ${body.slice(0, 200)}`);
		}
	});
	page.on('console', msg => {
		if (msg.type() === 'error') console.log('console.error:', msg.text());
	});

	const ctx = createDemoContext(page, base, '.integration-run', new DemoReporter(), []);
	await attemptPasswordSignIn(page, base, fixture.email, fixture.password);
	await runWebTenantSetup(ctx);

	await page.goto(`${base}/school/students`, { waitUntil: 'domcontentloaded' });
	await page.waitForTimeout(8_000);

	console.log('\nFailed HTTP responses:');
	for (const line of failed.slice(-20)) console.log(line);
	console.log('\nURL:', page.url());
	console.log('Body:', (await page.locator('body').innerText()).slice(0, 400).replace(/\s+/g, ' '));

	await browser.close();
}

main();
