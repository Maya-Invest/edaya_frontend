#!/usr/bin/env bun
/**
 * Probe academic-years vs academic-periods list auth for the fixture tenant.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { waitForAppShell } from './qa-matrix-support';

const fixture = JSON.parse(
	await readFile(path.join(import.meta.dirname, '../.integration-run/fixture.json'), 'utf8'),
) as { email: string; password: string; schoolId: string };

const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const api = process.env.API_URL ?? 'http://localhost:9999';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await attemptPasswordSignIn(page, base, fixture.email, fixture.password);
await waitForAppShell(page);

const cookies = await page.context().cookies();
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

async function listEntity(entity: string, body: unknown) {
	const res = await page.request.post(`${api}/core/entities/${entity}/list`, {
		headers: {
			Cookie: cookieHeader,
			'Content-Type': 'application/json',
		},
		data: body,
	});
	const text = await res.text();
	return { status: res.status(), body: text.slice(0, 500) };
}

const schoolId = fixture.schoolId;
const probes = {
	yearsScoped: await listEntity('academic-years', { schoolId, limit: 50 }),
	periodsScoped: await listEntity('academic-periods', { schoolId, limit: 50 }),
	periodsEmpty: await listEntity('academic-periods', {}),
	periodsFilterEq: await listEntity('academic-periods', { schoolId: { $eq: schoolId }, limit: 50 }),
	yearsEmpty: await listEntity('academic-years', {}),
};

const outDir = path.join(import.meta.dirname, '../.integration-run/repro');
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'academic-periods-403-probe.json'), JSON.stringify({ schoolId, probes }, null, 2));
console.log(JSON.stringify({ schoolId, probes }, null, 2));
await browser.close();
