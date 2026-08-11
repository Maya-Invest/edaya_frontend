#!/usr/bin/env bun
/**
 * Provision a fresh integration tenant via API (user + school + wizard flag).
 *
 * API creates: user, school. API flags: wizardCompleted.
 * All academic structure and entities are created via web UI during qa-matrix setup.
 *
 * Prerequisites:
 *   - API at API_URL (default http://localhost:9999)
 *   - WEBAPP_URL for Better Auth Origin header (default http://localhost:5173)
 *
 * Writes .integration-run/fixture.json
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { provisionTenant } from '../tests/integration/support/api-provision';

const OUT_DIR = path.join(import.meta.dirname, '..', '.integration-run');
export const FIXTURE_PATH = path.join(OUT_DIR, 'fixture.json');

async function main(): Promise<void> {
	await mkdir(OUT_DIR, { recursive: true });

	console.log('Provisioning integration tenant...');
	const tenant = await provisionTenant();

	await writeFile(FIXTURE_PATH, JSON.stringify(tenant, null, 2));

	console.log('Provisioned tenant:');
	console.log(`  email:    ${tenant.email}`);
	console.log(`  password: ${tenant.password}`);
	console.log(`  school:   ${tenant.schoolName} (${tenant.schoolId})`);
	console.log(`  fixture:  ${FIXTURE_PATH}`);
}

main().catch((err) => {
	console.error('Provisioning failed:', err instanceof Error ? err.message : err);
	process.exit(1);
});
