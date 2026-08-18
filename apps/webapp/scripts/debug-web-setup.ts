#!/usr/bin/env bun
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { createDemoContext } from '../tests/integration/demo-dry-run/support/context';
import { DemoReporter } from '../tests/integration/demo-dry-run/support/reporter';
import { runWebTenantSetup } from '../tests/integration/setup/web-tenant-setup';

const FIXTURE = path.join(import.meta.dirname, '..', '.integration-run', 'fixture.json');
const base = 'http://localhost:5173';

async function main(): Promise<void> {
	const fixture = JSON.parse(await readFile(FIXTURE, 'utf8')) as { email: string; password: string };
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const ctx = createDemoContext(page, base, '.integration-run', new DemoReporter(), []);

	const ok = await attemptPasswordSignIn(page, base, fixture.email, fixture.password);
	console.log('login:', ok, page.url());
	if (!ok) {
		await browser.close();
		process.exit(1);
	}

	const result = await runWebTenantSetup(ctx);
	console.log(JSON.stringify(result.steps, null, 2));
	await browser.close();
	process.exit(result.steps.every(s => s.ok) ? 0 : 1);
}

main();
