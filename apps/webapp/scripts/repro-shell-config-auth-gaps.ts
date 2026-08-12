#!/usr/bin/env bun
/**
 * Reproduce Shell / Config subjects / Finance / Auth QA gaps.
 * Run: bunx tsx scripts/repro-shell-config-auth-gaps.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { provisionTenant } from '../tests/integration/support/api-provision';
import { waitForAppShell } from './qa-matrix-support';
import { waitForPageQuery } from './qa-harness-ui';

const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const outDir = path.join(import.meta.dirname, '../.integration-run/repro');

type Check = {
	id: string;
	category: 'harness' | 'product' | 'timing' | 'unknown';
	ok: boolean;
	detail: string;
	evidence?: Record<string, unknown>;
};

async function main() {
	const checks: Check[] = [];
	const tenant = await provisionTenant();
	const browser = await chromium.launch({ headless: true });

	// ── Auth: unauthenticated redirect ───────────────────────────────────
	{
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1_500);
		const urlAt15 = page.url();
		await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => null);
		const urlAtFinal = page.url();
		const redirectedFast = urlAt15.includes('/login');
		const redirectedSlow = urlAtFinal.includes('/login');
		checks.push({
			id: 'shell.unauth-redirect',
			category: redirectedFast ? 'harness' : redirectedSlow ? 'timing' : 'product',
			ok: redirectedSlow,
			detail: redirectedFast
				? 'Redirected within 1.5s'
				: redirectedSlow
					? `Harness timeout too short — redirected after 1.5s (final=${urlAtFinal})`
					: `No redirect to /login (at1.5s=${urlAt15}, final=${urlAtFinal})`,
			evidence: { urlAt15, urlAtFinal },
		});
		await ctx.close();
	}

	// ── Auth: inline error vs toast ──────────────────────────────────────
	{
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
		await page.getByRole('button', { name: /password|mot de passe/i }).click().catch(() => {});
		const email = page.locator('#login-password-email');
		const password = page.locator('#login-password');
		await email.waitFor({ state: 'visible', timeout: 10_000 });
		await email.fill(tenant.email);
		await password.fill('WrongPassword999!');
		await page.locator('form').filter({ has: email }).getByRole('button', { name: /sign in|se connecter/i }).click();
		await page.waitForTimeout(2_500);
		const inline = await page.locator('[role="alert"], .text-destructive, form .text-red-500, form p.text-red').first().isVisible().catch(() => false);
		const toast = await page.locator('[data-sonner-toast], [data-toast], li[data-type="error"], .toaster').first().isVisible().catch(() => false);
		checks.push({
			id: 'auth.inline-error',
			category: 'product',
			ok: inline,
			detail: inline
				? 'Inline error visible'
				: `No inline error (toastLikely=${toast}) — LoginPasswordPanel uses toast.error only`,
			evidence: { inline, toast },
		});
		await ctx.close();
	}

	// ── Auth: invite invalid token ───────────────────────────────────────
	{
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		await page.goto(`${base}/invite/qa-invalid-token`, { waitUntil: 'domcontentloaded' });
		await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
		await page.waitForTimeout(1_000);
		const msg = page.getByText(/invalide|expiré|expired|invalid|introuvable|not found|révoqué|revoked/i).first();
		const visible = await msg.isVisible({ timeout: 12_000 }).catch(() => false);
		const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 500);
		checks.push({
			id: 'auth.invite-invalid',
			category: visible ? 'harness' : 'product',
			ok: visible,
			detail: visible ? 'Invalid-token message shown' : 'Message token invalide non affiché',
			evidence: { bodyText },
		});
		await ctx.close();
	}

	// ── Signed-in shell / config / finance ───────────────────────────────
	{
		const page = await browser.newPage();
		const signedIn = await attemptPasswordSignIn(page, base, tenant.email, tenant.password);
		if (!signedIn) {
			checks.push({
				id: 'setup.sign-in',
				category: 'unknown',
				ok: false,
				detail: 'Sign-in failed — remaining checks skipped',
			});
		}
		else {
			await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
			await waitForAppShell(page);

			// Sidebar
			const sidebar = page.locator('aside#app-sidebar');
			const sidebarVisible = await sidebar.isVisible().catch(() => false);
			const linkCount = await sidebar.locator('a[href], nav button').count();
			const harnessSidebarOk = sidebarVisible && linkCount > 2;
			checks.push({
				id: 'shell.sidebar',
				category: harnessSidebarOk ? 'harness' : 'timing',
				ok: harnessSidebarOk,
				detail: harnessSidebarOk
					? `Sidebar OK (${linkCount} entries) — matrix failure likely timing/grants race`
					: `Sidebar visible=${sidebarVisible} links=${linkCount} (harness needs >2)`,
				evidence: { sidebarVisible, linkCount },
			});

			// Year selector — harness vs reality
		const yearByHarness = await page.locator('[data-testid="academic-year-trigger"]')
			.or(page.getByRole('button', { name: /année|year|scolaire/i }))
			.first()
			.isVisible({ timeout: 2_000 }).catch(() => false);
			const yearButtons = page.locator('div.relative.flex.items-center button').filter({ has: page.locator('span') });
			const academicHeaderButtons = await page.locator('header button, .relative.flex.items-center.gap-1\\.5 button').count().catch(() => 0);
			const yearLabelText = await page.evaluate(() => {
				const buttons = [...document.querySelectorAll('button')];
				return buttons
					.map(b => ({
						text: (b.textContent ?? '').trim().slice(0, 40),
						aria: b.getAttribute('aria-label') ?? '',
						testid: b.getAttribute('data-testid') ?? '',
					}))
					.filter(b => b.text.length > 0 && b.text.length < 30)
					.slice(0, 25);
			});
			checks.push({
				id: 'shell.year-selector',
				category: 'harness',
				ok: yearByHarness,
				detail: yearByHarness
					? 'Harness year selector found'
					: 'Harness regex /année|year|scolaire/ misses AcademicHeader (accessible name = year label only)',
				evidence: { yearByHarness, academicHeaderButtons, sampleButtons: yearLabelText },
			});

			// Avatar / profile
			const byTestId = await page.locator('[data-testid="user-menu"]').first().isVisible().catch(() => false);
			const byAriaCompte = await page.locator('button[aria-label*="compte" i], button[aria-label*="Open my account" i], button[aria-label*="Ouvrir mon compte" i]').first()
				.isVisible().catch(() => false);
			const openProfileAria = await page.getByRole('button', { name: /ouvrir mon compte|open my account/i }).first()
				.isVisible().catch(() => false);
			checks.push({
				id: 'shell.avatar',
				category: 'harness',
				ok: byTestId || byAriaCompte || openProfileAria,
				detail: (byTestId || byAriaCompte || openProfileAria)
					? 'Harness avatar selector matched'
					: 'Menu utilisateur introuvable',
				evidence: { byTestId, byAriaCompte, openProfileAria },
			});

			if (byTestId || openProfileAria) {
				const profileBtn = byTestId
					? page.locator('[data-testid="user-menu"]').first()
					: page.getByRole('button', { name: /ouvrir mon compte|open my account/i }).first();
				await profileBtn.click();
				const dialog = await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false);
				checks.push({
					id: 'shell.avatar-opens-modal',
					category: dialog ? 'harness' : 'product',
					ok: dialog,
					detail: dialog ? 'Profile modal opens when correct selector used' : 'Profile button present but dialog missing',
				});
				await page.keyboard.press('Escape').catch(() => {});
			}

			// Subjects catalog
			await page.goto(`${base}/configuration/subjects`, { waitUntil: 'domcontentloaded' });
			await waitForAppShell(page);
			await waitForPageQuery(page);
			const createByHarness = await page.getByRole('button', { name: /add subject|ajouter une matière/i }).first()
				.isVisible({ timeout: 10_000 }).catch(() => false);
			const hasFilterSelect = await page.locator('select[aria-label="Filter"], [data-testid="list-filter"]').first()
				.isVisible({ timeout: 10_000 }).catch(() => false);
			const hasCombobox = await page.getByRole('combobox').first().isVisible().catch(() => false);
			const hasMain = await page.locator('main, [role="main"], h1, h2').first().isVisible().catch(() => false);
			const listHeader = await page.getByText(/matière|subject|curriculum|programme/i).first().isVisible().catch(() => false);
			checks.push({
				id: 'config.subjects-create',
				category: 'product',
				ok: createByHarness,
				detail: createByHarness
					? 'Create subject button present'
					: 'No create button on subjects catalog (product gap vs feature-architecture-spec inline create)',
				evidence: { createByHarness, hasFilterSelect, hasCombobox, hasMain, listHeader },
			});
			checks.push({
				id: 'config.subjects-filter',
				category: 'harness',
				ok: hasCombobox || hasFilterSelect,
				detail: hasCombobox
					? 'Filter combobox present'
					: hasFilterSelect
						? 'Native <select aria-label=Filter> present — harness looks for role=combobox only'
						: 'No filter control found',
				evidence: { hasCombobox, hasFilterSelect },
			});

			// Finance billing
			await page.goto(`${base}/finance/billing`, { waitUntil: 'domcontentloaded' });
			await page.waitForTimeout(2_000);
			const assignByLabel = await page.getByRole('button', { name: /ajouter une facture|add invoice/i }).first()
				.isVisible().catch(() => false);
			const assignByEditRegex = await page.getByRole('button', { name: /éditer|edit|modifier|assigner/i }).first()
				.isVisible().catch(() => false);
			if (assignByLabel) {
				await page.getByRole('button', { name: /ajouter une facture|add invoice/i }).first().click();
			}
			const assignDialog = await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false);
			await page.keyboard.press('Escape').catch(() => {});

			const rowLink = page.locator('a[href*="/finance/billing/"], button').filter({ hasText: /.+/ }).first();
			const rowClickable = await page.locator('a[href*="/finance/billing/"]').first().isVisible().catch(() => false);
			checks.push({
				id: 'finance.assign-drawer',
				category: 'harness',
				ok: assignByLabel && assignDialog,
				detail: assignByLabel
					? (assignDialog
						? 'Assign-fee modal opens via "Ajouter une facture" — harness edit/drawer path looks for /éditer|assigner/ and misses it'
						: 'Invoice button present but dialog did not open')
					: `Invoice CTA missing (editRegex=${assignByEditRegex})`,
				evidence: { assignByLabel, assignByEditRegex, assignDialog, rowClickable },
			});
		}
		await page.close().catch(() => {});
	}

	await browser.close();

	const summary = {
		generatedAt: new Date().toISOString(),
		tenant: { email: tenant.email, schoolId: tenant.schoolId },
		base,
		passed: checks.filter(c => c.ok).length,
		failed: checks.filter(c => !c.ok).length,
		byCategory: {
			harness: checks.filter(c => c.category === 'harness').length,
			product: checks.filter(c => c.category === 'product').length,
			timing: checks.filter(c => c.category === 'timing').length,
			unknown: checks.filter(c => c.category === 'unknown').length,
		},
		checks,
	};

	await mkdir(outDir, { recursive: true });
	const outPath = path.join(outDir, 'shell-config-auth-gaps.json');
	await writeFile(outPath, JSON.stringify(summary, null, 2));
	console.log(JSON.stringify(summary, null, 2));
	console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
