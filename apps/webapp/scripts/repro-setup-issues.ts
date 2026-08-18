#!/usr/bin/env bun
/**
 * Reproduce classId discovery + student setup issues from web tenant setup.
 * Run: bunx tsx scripts/repro-setup-issues.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { attemptPasswordSignIn, waitForEnabled } from '../tests/integration/demo-dry-run/support/auth';
import { DEMO_WEBAPP_BASE } from '../tests/integration/demo-dry-run/support/paths';
import { provisionTenant } from '../tests/integration/support/api-provision';
import {
	dismissPageError,
	openDialogButton,
	refreshAppShell,
	submitDialog,
	waitForPageQuery,
} from './qa-harness-ui';
import { discoverEntities, firstIdFromLinks, waitForAppShell } from './qa-matrix-support';

const OUT_DIR = path.join(import.meta.dirname, '../.integration-run/repro');

async function diagClassDiscovery(page: import('playwright').Page, base: string) {
	await page.goto(`${base}/configuration/classes`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);
	await dismissPageError(page);

	const linkHrefs = await page.locator('a[href]').evaluateAll(els =>
		els.slice(0, 50).map(el => el.getAttribute('href')).filter(Boolean),
	);
	const configClassLinks = linkHrefs.filter(h => h?.includes('/configuration/classes/'));
	const classLinks = linkHrefs.filter(h => h?.match(/\/classes\/[^/]+/) && !h?.includes('/configuration/'));

	const tableRows = await page.locator('table tbody tr').count();
	const rowButtons = await page.locator('table tbody button').count();
	const visibleClassIds = await page.locator('table tbody .font-mono').allTextContents();
	const classNames = await page.locator('table tbody p.font-medium').allTextContents();

	const fromHarness = await firstIdFromLinks(page, /\/configuration\/classes\/([^/]+)/);

	return {
		url: page.url(),
		pageError: await page.getByText(/unable to load|une erreur est survenue/i).first().isVisible().catch(() => false),
		tableRows,
		rowButtons,
		visibleClassIds: visibleClassIds.slice(0, 5),
		visibleClassNames: classNames.slice(0, 5),
		idFromTableMono: visibleClassIds[0] ?? null,
		anchorLinksTotal: linkHrefs.length,
		configClassAnchorLinks: configClassLinks.length,
		classAnchorLinks: classLinks.length,
		firstIdFromLinksResult: fromHarness,
		sampleHrefs: linkHrefs.slice(0, 8),
	};
}

async function diagStudentModal(page: import('playwright').Page, base: string) {
	await page.goto(`${base}/school/students`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);
	await dismissPageError(page);

	const opened = await openDialogButton(page, /add student|ajouter un élève/i, 30_000);
	if (!opened) {
		return { opened: false, reason: 'Create student modal not found' };
	}

	const dialog = page.getByRole('dialog');
	const inputs = await dialog.locator('input').count();
	const comboboxVisible = await dialog.getByRole('combobox').first().isVisible().catch(() => false);

	let optionCount = 0;
	if (comboboxVisible) {
		await dialog.getByRole('combobox').first().click();
		optionCount = await page.getByRole('option').count();
		await page.keyboard.press('Escape');
	}

	await dialog.locator('input').nth(0).fill('E2E');
	await dialog.locator('input').nth(1).fill(`Student${Date.now()}`);

	if (comboboxVisible && optionCount > 0) {
		await dialog.getByRole('combobox').first().click();
		await page.getByRole('option').first().click({ timeout: 5_000 }).catch(() => {});
	}

	const submit = dialog.getByRole('button', { name: /add student|ajouter un élève|créer|create|enregistrer|save/i }).last();
	const submitDisabled = await submit.isDisabled().catch(() => true);
	const submitLabel = await submit.innerText().catch(() => '');

	let waitForEnabledError: string | null = null;
	try {
		await waitForEnabled(submit, 5_000);
	}
	catch (err) {
		waitForEnabledError = err instanceof Error ? err.message : String(err);
	}

	const noClassesMsg = await dialog.getByText(/no classes|aucune classe|pas de classe/i).isVisible().catch(() => false);
	const inviteChecked = await dialog.locator('#student-send-invite').isChecked().catch(() => null);
	const inviteEmailValue = await dialog.locator('input[type="email"]').inputValue().catch(() => '');

	return {
		opened: true,
		inputs,
		comboboxVisible,
		optionCount,
		noClassesMessage: noClassesMsg,
		inviteChecked,
		inviteEmailValue,
		submitDisabled,
		submitLabel,
		waitForEnabledError,
		onLoginPage: page.url().includes('/login'),
	};
}

async function main() {
	const base = process.env['WEBAPP_URL'] ?? DEMO_WEBAPP_BASE;
	await mkdir(OUT_DIR, { recursive: true });

	console.log('=== Provision tenant ===');
	const tenant = await provisionTenant({ appOrigin: base });
	console.log(`Email: ${tenant.email}`);

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const ctx = { page, base } as Parameters<typeof discoverEntities>[0];

	console.log('\n=== Login ===');
	const loginOk = await attemptPasswordSignIn(page, base, tenant.email, tenant.password);
	console.log(`Login: ${loginOk ? 'OK' : 'FAILED'}`);
	if (!loginOk) {
		await browser.close();
		process.exit(1);
	}
	await waitForAppShell(page);

	// Academic year (create only — year is active/published on create)
	console.log('\n=== Setup academic year ===');
	await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	await dismissPageError(page);
	const yearOpened = await openDialogButton(page, /add academic year|ajouter une année scolaire/i);
	if (yearOpened) {
		const label = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(label);
		await submitDialog(page);
		await page.waitForTimeout(2_000);
		await waitForPageQuery(page);
		const yearVisible = await page.getByRole('heading', { name: label }).isVisible().catch(() => false);
		console.log(`Academic year "${label}" visible in list: ${yearVisible}`);
		await refreshAppShell(page, base);
	}

	// Minimal setup: grade + class
	console.log('\n=== Setup grade level ===');
	await page.goto(`${base}/configuration/grade-levels`, { waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const gradeOpened = await openDialogButton(page, /ajouter un niveau|add grade level/i);
	if (gradeOpened) {
		const name = `E2E-6eme-${Date.now()}`;
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').nth(0).fill(name);
		const labelInput = dialog.locator('input').nth(1);
		if (await labelInput.isVisible().catch(() => false)) {
			await labelInput.fill(name);
		}
		await submitDialog(page);
		await page.waitForTimeout(2_000);
		console.log(`Grade level created: ${name}`);
		await refreshAppShell(page, base);
	}

	console.log('\n=== Setup class ===');
	await page.goto(`${base}/configuration/grade-levels`, { waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const gradeRowCount = await page.locator('table tbody tr, [data-testid], section').count();
	console.log(`Grade levels page row-like elements: ${gradeRowCount}`);

	await page.goto(`${base}/configuration/classes`, { waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const classOpened = await openDialogButton(page, /ajouter une classe|add class/i);
	let className: string | null = null;
	if (classOpened) {
		className = `E2E-6A-${Date.now()}`;
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(className);
		const gradeSelect = dialog.locator('select').first();
		if (await gradeSelect.isVisible().catch(() => false)) {
			const optionValues = await gradeSelect.locator('option').evaluateAll(opts =>
				opts.map(o => ({ value: o.getAttribute('value'), text: o.textContent?.trim() })),
			);
			console.log(`Grade select options: ${JSON.stringify(optionValues)}`);
			if (optionValues.length > 0) {
				await gradeSelect.selectOption({ index: 0 });
			}
		}
		await submitDialog(page);
		await page.waitForTimeout(2_500);
		const dialogStillOpen = await page.getByRole('dialog').isVisible().catch(() => false);
		const rowWithName = await page.getByText(className).isVisible().catch(() => false);
		console.log(`Class created: ${className} (dialog still open: ${dialogStillOpen}, visible in list: ${rowWithName})`);
		await refreshAppShell(page, base);
	}
	else {
		console.log('Class modal did not open');
	}

	console.log('\n=== REPRO 1: classId discovery ===');
	const classDiag = await diagClassDiscovery(page, base);
	console.log(JSON.stringify(classDiag, null, 2));

	console.log('\n=== discoverEntities() ===');
	const entities = await discoverEntities(ctx);
	console.log(`configClassId: ${entities.configClassId}`);
	console.log(`classId: ${entities.classId}`);

	console.log('\n=== REPRO 2: student modal submit ===');
	const studentDiag = await diagStudentModal(page, base);
	console.log(JSON.stringify(studentDiag, null, 2));

	const report = {
		generatedAt: new Date().toISOString(),
		tenant: { email: tenant.email, schoolId: tenant.schoolId },
		classSetupName: className,
		classDiscovery: classDiag,
		discoverEntities: { configClassId: entities.configClassId, classId: entities.classId, studentId: entities.studentId },
		studentModal: studentDiag,
		conclusions: {
			classIdIssue:
				classDiag.tableRows > 0 && classDiag.configClassAnchorLinks === 0
					? 'CONFIRMED: classes in table but no <a href> — firstIdFromLinks returns null while idFromTableMono works'
					: classDiag.tableRows === 0
						? 'Class not in list — create likely failed (empty grade select / modal stayed open)'
						: 'INCONCLUSIVE — check classDiscovery details',
			studentIssue:
				studentDiag.noClassesMessage
					? 'CONFIRMED: academicContext.hierarchy empty — no class picker, submit disabled (not an API/login failure)'
					: studentDiag.inviteChecked && !studentDiag.inviteEmailValue
						? 'CONFIRMED: sendAccountInvitation checked but no invite email — canSubmit stays false'
						: studentDiag.waitForEnabledError
							? `Submit disabled: ${studentDiag.waitForEnabledError.replace(/^locator\.evaluate: Error: /, '')}`
							: 'NOT REPRODUCED in isolation',
		},
	};

	const reportPath = path.join(OUT_DIR, 'setup-issues.json');
	await writeFile(reportPath, JSON.stringify(report, null, 2));
	console.log(`\nReport: ${reportPath}`);

	await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
