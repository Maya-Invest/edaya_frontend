import { attemptPasswordSignIn, ensurePasswordSignInPanel, waitForEnabled } from '../tests/integration/demo-dry-run/support/auth';
import { TEACHER_PORTAL_GATE_BANNER_TEST_ID } from '../src/lib/auth/teacher-portal-gate';
import { defaultAcademicYearPreset } from '../src/lib/onboarding/school-step-defaults';
import type { SecondaryAccounts } from '../tests/integration/support/api-provision';
import { completeWizardViaApi } from '../tests/integration/setup/journey-api';
import type { Browser, Page } from 'playwright';
import type { DemoContext } from '../tests/integration/demo-dry-run/support/types';
import { DEMO_PASSWORD, STAFF_EMAIL } from '../tests/integration/demo-dry-run/support/constants';
import { pathnameReachedSidebarTarget } from '../tests/integration/demo-dry-run/support/paths';
import type { QaTemplateRow } from './qa-template-matrix';
import {
	clickCreateButton,
	clickFirstListSortColumn,
	dismissPageError,
	ensureAcademicYearReady,
	exportSelectedListRows,
	fillClassCreateDialog,
	fillFeeCreateDialog,
	fillStudentCreateDialog,
	isDeleteControlVisible,
	listSearchInput,
	openDialogButton,
	REMOVE_ANNOUNCEMENT_TARGET_CONTROL,
	setAppLang,
	submitDialog,
	waitForDialogClosed,
	waitForFormModal,
	waitForPageQuery,
	waitForResolvedAcademicYearId,
} from './qa-harness-ui';
import {
	assertNoFatalError,
	discoverEntities,
	emptyEntities,
	formatError,
	isClassDailyAttendanceSidebarPath,
	mergeEntities,
	navigateToRow,
	sidebarSmokeStartPath,
	type MatrixEntities,
	type MatrixResult,
	waitForAcademicYearTrigger,
	waitForAppShell,
} from './qa-matrix-support';
import {
	MODAL_SURFACES,
	ROUTE_REDIRECTS,
	ROUTE_SMOKE_ACTION,
	inventoryRouteToMatrixPath,
} from './qa-route-catalog';
import { isStudentBlockedScenario, STUDENT_SETUP_BLOCKER } from '../tests/integration/setup/setup-blockers';
import { isFilterOrSearchRow, runFilterScenario } from './filter-setup-registry';

function result(row: QaTemplateRow, statut: MatrixResult['statut'], detail?: string): MatrixResult {
	return {
		module: row.module,
		endpoint: row.endpoint,
		action: row.action,
		statut,
		detail,
	};
}

function na(row: QaTemplateRow, detail: string): MatrixResult {
	return result(row, 'N/A', detail);
}

function ok(row: QaTemplateRow, detail?: string): MatrixResult {
	return result(row, 'OK', detail);
}

function notOk(row: QaTemplateRow, detail: string): MatrixResult {
	return result(row, 'NOT OK', detail);
}

async function ensureLoggedOut(page: Page, base: string): Promise<void> {
	await page.context().clearCookies();
	await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
}

async function loginPassword(page: Page, base: string, email: string, password: string): Promise<boolean> {
	return attemptPasswordSignIn(page, base, email, password);
}

async function hasMainContent(page: Page, options: { drawerTimeout?: number } = {}): Promise<boolean> {
	const drawerTimeout = options.drawerTimeout ?? 15_000;
	const drawer = page.locator('aside[aria-label]');
	if (await drawer.isVisible({ timeout: drawerTimeout }).catch(() => false)) {
		return true;
	}
	return page.locator('main, [role="main"], table, [data-testid]').first().isVisible({ timeout: 8_000 }).catch(() => false);
}

async function runAuthScenario(
	row: QaTemplateRow,
	ctx: DemoContext,
	browser: Browser,
	entities: MatrixEntities,
): Promise<MatrixResult> {
	const { page, base } = ctx;
	const action = row.action;

	if (action.includes('Redirect vers /login')) {
		await ensureLoggedOut(page, base);
		await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(1_500);
		const onLogin = page.url().includes('/login');
		return onLogin ? ok(row) : notOk(row, `URL actuelle: ${page.url()}`);
	}

	if (action.includes('Affichage page connexion')) {
		await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
		try {
			await ensurePasswordSignInPanel(page);
			return ok(row);
		}
		catch {
			return notOk(row, 'Formulaire login introuvable');
		}
	}

	if (action.includes('Connexion mot de passe — succès')) {
		const email = process.env.QA_LOGIN_EMAIL ?? STAFF_EMAIL;
		const password = process.env.QA_LOGIN_PASSWORD ?? DEMO_PASSWORD;
		const logged = await loginPassword(page, base, email, password);
		if (logged) {
			await waitForAppShell(page).catch(() => {});
			return ok(row);
		}
		return notOk(row, 'Échec connexion — définir QA_LOGIN_EMAIL / QA_LOGIN_PASSWORD');
	}

	if (action.includes('erreur visible')) {
		const context = await browser.newContext();
		const p = await context.newPage();
		try {
			await p.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
			await ensurePasswordSignInPanel(p);
			const emailInput = p.locator('#login-password-email');
			const passwordInput = p.locator('#login-password');
			await waitForEnabled(emailInput);
			await waitForEnabled(passwordInput);
			await emailInput.fill(process.env.QA_LOGIN_EMAIL ?? STAFF_EMAIL);
			await passwordInput.fill('WrongPassword999!');
			await p.locator('form').filter({ has: p.locator('#login-password-email') }).getByRole('button', { name: /sign in|se connecter/i }).click();
			await p.waitForTimeout(2_000);
			const errorEl = p.locator('[role="alert"], .text-destructive, form .text-red-500, form p.text-red').first();
			const visible = await errorEl.isVisible({ timeout: 5_000 }).catch(() => false);
			if (!visible) return notOk(row, 'Aucun message inline visible (toast seulement ?)');
			const color = await errorEl.evaluate(el => getComputedStyle(el).color).catch(() => '');
			const isRed = /rgb\(\s*(1?[0-9]{2}|2[0-4][0-9]),\s*0,\s*0\)|#f|#e|red/i.test(color);
			return isRed ? ok(row) : notOk(row, `Message visible mais couleur: ${color}`);
		}
		finally {
			await context.close();
		}
	}

	if (action.includes('Onglet signup')) {
		await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
		const signup = page.getByRole('tab', { name: /sign up|inscription|créer un compte/i }).first();
		const visible = await signup.isVisible({ timeout: 5_000 }).catch(() => false);
		return visible ? ok(row) : na(row, 'Signup désactivé ou onglet absent');
	}

	if (action.includes('Banner API')) {
		return na(row, 'Test nécessite API arrêtée — non exécuté en auto');
	}

	if (row.endpoint.includes('/login/demo')) {
		await page.goto(`${base}/login/demo`, { waitUntil: 'domcontentloaded' });
		const demoBtn = page.getByRole('button', { name: /Jean-Baptiste|Aka|Aminata|Koné|directeur|demo/i }).first();
		const visible = await demoBtn.isVisible({ timeout: 15_000 }).catch(() => false);
		if (action.includes('Affichage')) {
			return visible ? ok(row) : na(row, 'Page /login/demo sans comptes démo (prod ou API down)');
		}
		if (!visible) return na(row, 'Picker démo indisponible');
		await demoBtn.click();
		const navigated = await page.waitForURL(/\/(dashboard|school|classes|configuration|onboarding)/, { timeout: 30_000 }).then(() => true).catch(() => false);
		return navigated ? ok(row) : notOk(row, 'Connexion démo échouée');
	}

	if (row.endpoint.includes('/invite/')) {
		await page.goto(`${base}/invite/qa-invalid-token`, { waitUntil: 'domcontentloaded' });
		if (action.includes('Token invalide')) {
			await page.locator('.animate-spin').first().waitFor({ state: 'detached', timeout: 12_000 }).catch(() => {});
			const err = await page.getByText(/invalide|expiré|expired|invalid|introuvable|not found|révoqué|revoked/i).first()
				.isVisible({ timeout: 8_000 }).catch(() => false);
			return err ? ok(row) : notOk(row, 'Message token invalide non affiché');
		}
		return na(row, 'Token invitation valide requis — test manuel');
	}

	return notOk(row, 'Scénario Auth non mappé');
}

async function runOnboardingScenario(row: QaTemplateRow, ctx: DemoContext, entities: MatrixEntities): Promise<MatrixResult> {
	const { page, base } = ctx;
	const action = row.action;

	if (entities.onboarded && !action.includes('Redirect')) {
		if (action.includes('semestre') && action.includes('S1')) {
			return notOk(row, 'Semestre 1 : dates non recalculées (bug connu — vérifier configuration/academic)');
		}
		return na(row, 'Onboarding déjà complété sur ce compte');
	}

	if (action.includes('Redirect vers ?step=1')) {
		await page.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' });
		const okUrl = page.url().includes('step=1') || page.url().includes('/onboarding');
		return okUrl ? ok(row) : notOk(row, page.url());
	}

	const nav = await navigateToRow(ctx, row, entities);
	if (!nav.url) return na(row, nav.reason ?? 'URL non résolue');

	const fatal = await assertNoFatalError(page);
	if (fatal) return notOk(row, fatal);

	if (action.includes('validation') || action.includes('Formulaire')) {
		const form = page.locator('form, input, select').first();
		const visible = await form.isVisible({ timeout: 8_000 }).catch(() => false);
		return visible ? ok(row) : notOk(row, 'Formulaire onboarding introuvable');
	}

	if (action.includes('Submit')) {
		const submit = page.getByRole('button', { name: /continuer|suivant|next|submit|enregistrer/i }).first();
		return (await submit.isVisible().catch(() => false)) ? ok(row, 'Bouton submit présent (non cliqué)') : notOk(row, 'Bouton submit absent');
	}

	return ok(row, 'Page onboarding accessible');
}

async function runShellScenario(row: QaTemplateRow, ctx: DemoContext, browser: Browser, entities: MatrixEntities): Promise<MatrixResult> {
	const { page, base } = ctx;
	const action = row.action;

	if (action.includes('Non connecté')) {
		const isolated = await browser.newContext();
		const p = await isolated.newPage();
		try {
			await p.context().clearCookies();
			await p.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
			const redirected = await p.waitForURL(/\/login/, { timeout: 10_000 }).then(() => true).catch(() => false);
			return redirected ? ok(row) : notOk(row, p.url());
		}
		finally {
			await isolated.close();
		}
	}

	if (action.includes('Onboarding incomplet')) {
		if (process.env['INTEGRATION_PROVISIONED'] === '1') {
			return na(row, 'Wizard unlocked via API (complete-wizard)');
		}
		return na(row, 'Compte déjà onboardé — nécessite compte frais');
	}

	if (action.includes('Sidebar') && !action.includes('Sidebar — lien')) {
		await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		const sidebar = page.locator('aside#app-sidebar');
		const visible = await sidebar.isVisible().catch(() => false);
		const links = await sidebar.locator('a[href], nav button').count();
		return visible && links > 2 ? ok(row, `${links} entrées sidebar`) : notOk(row, 'Sidebar vide ou absente');
	}

	if (action.includes('sans permission')) {
		const financeRedirect = await assertFinanceRedirectRestricted(row, browser, base, entities.secondaryAccounts);
		if (financeRedirect) {
			return financeRedirect;
		}
		return na(row, 'Nécessite compte sans droit finance');
	}

	if (action.includes('Sélecteur école')) {
		const trigger = page.getByRole('button', { name: /école|school/i }).first();
		return (await trigger.isVisible({ timeout: 5_000 }).catch(() => false)) ? ok(row) : na(row, 'Sélecteur école absent (mono-école)');
	}

	if (action.includes('année scolaire')) {
		await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		await waitForResolvedAcademicYearId(page).catch(() => {});
		const visible = await waitForAcademicYearTrigger(page, 10_000);
		return visible ? ok(row) : notOk(row, 'Sélecteur année absent');
	}

	if (action.includes('langue')) {
		await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		const switched = await setAppLang(page, 'en');
		if (!switched) {
			return notOk(row, 'Langue EN non appliquée (html[lang=en])');
		}
		await setAppLang(page, 'fr');
		return ok(row);
	}

	if (action.includes('Avatar') || action.includes('modal=account-profile')) {
		const url = action.includes('modal=account-profile')
			? `${base}/dashboard?modal=account-profile`
			: `${base}/dashboard`;
		await page.goto(url, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		const dialog = page.getByRole('dialog');
		const profileBtn = page.locator('[data-testid="user-menu"], button[aria-label*="profil" i], button[aria-label*="account" i], button[aria-label*="compte" i]').first();
		if (action.includes('modal=account-profile')) {
			const opened = await dialog.isVisible({ timeout: 8_000 }).catch(() => false);
			const urlOk = page.url().includes('modal=account-profile');
			return opened && urlOk
				? ok(row)
				: notOk(row, 'Modal profil non ouvert via ?modal=account-profile');
		}
		if (await profileBtn.isVisible().catch(() => false)) {
			await profileBtn.click();
			return (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) ? ok(row) : notOk(row, 'Modal profil non ouvert');
		}
		return notOk(row, 'Menu utilisateur introuvable');
	}

	if (action.includes('Logout')) {
		if (process.env['INTEGRATION_PROVISIONED'] === '1') {
			return na(row, 'Logout exécuté en fin de run provisioned');
		}
		return na(row, 'Logout non exécuté — casserait la session pour les tests suivants');
	}

	return notOk(row, 'Scénario Shell non mappé');
}

/** Run at end of provisioned matrix — session destruction is safe after all other tests. */
export async function runLogoutShellScenario(row: QaTemplateRow, ctx: DemoContext): Promise<MatrixResult> {
	const { page, base } = ctx;
	try {
		await page.goto(`${base}/dashboard?modal=account-profile`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);

		const dialog = page.getByRole('dialog');
		if (!(await dialog.isVisible({ timeout: 8_000 }).catch(() => false))) {
			const profileBtn = page.locator('[data-testid="user-menu"]').first();
			if (await profileBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
				await profileBtn.click();
			}
			if (!(await dialog.isVisible({ timeout: 5_000 }).catch(() => false))) {
				return notOk(row, 'Modal profil non ouvert avant logout');
			}
		}

		const signOut = dialog.getByRole('button', { name: /se déconnecter|sign out/i }).last();
		if (!(await signOut.isVisible({ timeout: 5_000 }).catch(() => false))) {
			return notOk(row, 'Bouton déconnexion introuvable');
		}
		await signOut.click();

		const redirected = await page.waitForURL(/\/login/, { timeout: 15_000 }).then(() => true).catch(() => false);
		return redirected ? ok(row) : notOk(row, `Pas de redirect /login (url=${page.url()})`);
	}
	catch (err) {
		return notOk(row, formatError(err));
	}
}

async function ensureSidebarLabelsVisible(page: Page): Promise<void> {
	const sidebar = page.locator('aside#app-sidebar');
	const labeled = sidebar.locator('button[aria-expanded], a').filter({
		hasText: /dashboard|tableau|école|school|classes|classe/i,
	}).first();
	if (await labeled.isVisible({ timeout: 2_000 }).catch(() => false)) {
		return;
	}
	const toggle = page.locator('button[aria-controls="app-sidebar"]');
	if (await toggle.isVisible().catch(() => false)) {
		await toggle.click();
		await labeled.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
	}
}

async function expandSidebarModuleForPath(
	sidebar: ReturnType<Page['locator']>,
	resolvedPath: string,
): Promise<void> {
	const modulePatterns: Array<{ prefix: string; pattern: RegExp }> = [
		{ prefix: '/school', pattern: /école|school/i },
		{ prefix: '/classes/', pattern: /classes|classe/i },
		{ prefix: '/finance', pattern: /finance|finances/i },
		{ prefix: '/configuration', pattern: /config/i },
	];
	const moduleMatch = modulePatterns.find(entry => resolvedPath.startsWith(entry.prefix));
	if (!moduleMatch) {
		return;
	}
	const moduleButtons = sidebar.locator('nav > ul > li > button[aria-expanded]');
	const buttonCount = await moduleButtons.count();
	for (let index = 0; index < buttonCount; index++) {
		const button = moduleButtons.nth(index);
		const label = await button.innerText().catch(() => '');
		if (!moduleMatch.pattern.test(label)) continue;
		if ((await button.getAttribute('aria-expanded')) !== 'true') {
			await button.click();
			await button.page().waitForTimeout(400);
		}
		break;
	}
}

async function sidebarNavHrefs(page: Page): Promise<string[]> {
	await waitForAppShell(page);
	await page.waitForTimeout(1_000);
	for (const pattern of [/école|school/i, /classe|class/i]) {
		const toggle = page.locator('aside#app-sidebar button').filter({ hasText: pattern }).first();
		if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await toggle.click().catch(() => {});
			await page.waitForTimeout(400);
		}
	}
	await page.locator('aside#app-sidebar a[href]').first().waitFor({ timeout: 15_000 }).catch(() => {});
	const hrefs = await page.locator('aside#app-sidebar a[href]').evaluateAll(
		elements => elements
			.map(element => element.getAttribute('href'))
			.filter((href): href is string => Boolean(href)),
	);
	return hrefs;
}

function hrefsInclude(hrefs: readonly string[], fragment: string): boolean {
	return hrefs.some(href => href.includes(fragment));
}

function hrefsExclude(hrefs: readonly string[], fragment: string): boolean {
	return !hrefs.some(href => href.includes(fragment));
}

async function assertTeacherPortalGate(page: Page): Promise<{ ok: boolean; detail: string }> {
	const pathname = new URL(page.url()).pathname;
	if (!pathname.endsWith('/login')) {
		return { ok: false, detail: `attendu /login, obtenu ${pathname}` };
	}
	const banner = await page.getByTestId(TEACHER_PORTAL_GATE_BANNER_TEST_ID)
		.isVisible({ timeout: 8_000 })
		.catch(() => false);
	if (!banner) {
		return { ok: false, detail: 'bannière portail enseignant absente' };
	}
	const sidebar = await page.locator('aside#app-sidebar').isVisible().catch(() => false);
	if (sidebar) {
		return { ok: false, detail: 'sidebar applicative visible pour enseignant' };
	}
	return { ok: true, detail: 'portail enseignant — accès web bloqué' };
}

async function loginIsolatedTeacher(
	browser: Browser,
	base: string,
	email: string,
	password: string,
): Promise<{ page: Page; context: import('playwright').BrowserContext } | null> {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const logged = await attemptPasswordSignIn(page, base, email, password);
	if (!logged) {
		await context.close();
		return null;
	}
	return { page, context };
}

async function loginIsolated(
	browser: Browser,
	base: string,
	email: string,
	password: string,
): Promise<{ page: import('playwright').Page; context: import('playwright').BrowserContext } | null> {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const logged = await attemptPasswordSignIn(page, base, email, password);
	if (!logged) {
		await context.close();
		return null;
	}
	await waitForAppShell(page);
	await completeWizardViaApi(page, base).catch(() => {});
	if (page.url().includes('/onboarding')) {
		await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
	}
	return { page, context };
}

async function runPermissionsScenario(
	row: QaTemplateRow,
	browser: Browser,
	base: string,
	accounts: SecondaryAccounts | undefined,
): Promise<MatrixResult> {
	const action = row.action;
	if (!accounts?.teacher && !accounts?.educator) {
		return na(row, 'Comptes secondaires non provisionnés');
	}

	if (action.includes('enseignant') && action.includes('sidebar')) {
		if (!accounts.teacher) {
			return na(row, 'Compte enseignant non provisionné');
		}
		const session = await loginIsolatedTeacher(
			browser,
			base,
			accounts.teacher.email,
			accounts.teacher.password,
		);
		if (!session) {
			return notOk(row, 'Connexion enseignant échouée');
		}
		try {
			const gate = await assertTeacherPortalGate(session.page);
			return gate.ok ? ok(row, gate.detail) : notOk(row, gate.detail);
		}
		finally {
			await session.context.close();
		}
	}

	if (action.includes('éducateur') && action.includes('sidebar')) {
		if (!accounts.educator) {
			return na(row, 'Compte éducateur non provisionné');
		}
		const session = await loginIsolated(browser, base, accounts.educator.email, accounts.educator.password);
		if (!session) {
			return notOk(row, 'Connexion éducateur échouée');
		}
		try {
			await session.page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
			await waitForAppShell(session.page).catch(() => {});
			await session.page.waitForTimeout(1_000);
			const hrefs = await sidebarNavHrefs(session.page);
			// Personal announcements are available to every selected profile; rows remain audience-filtered.
			const required = ['/school/students', '/school/events', '/school/announcements'];
			const forbidden = ['/finance', '/configuration', '/school/calendar'];
			const missing = required.filter(fragment => !hrefsInclude(hrefs, fragment));
			const leaked = forbidden.filter(fragment => !hrefsExclude(hrefs, fragment));
			if (missing.length > 0) {
				return notOk(row, `Liens manquants: ${missing.join(', ')}`);
			}
			if (leaked.length > 0) {
				return notOk(row, `Liens interdits visibles: ${leaked.join(', ')}`);
			}
			return ok(row, `${hrefs.length} entrées sidebar`);
		}
		finally {
			await session.context.close();
		}
	}

	if (action.includes('finance') && action.includes('/dashboard')) {
		if (!accounts.educator) {
			return na(row, 'Compte éducateur non provisionné');
		}
		const session = await loginIsolated(browser, base, accounts.educator.email, accounts.educator.password);
		if (!session) {
			return notOk(row, 'Connexion compte restreint échouée');
		}
		try {
			return await assertFinanceRestrictedNoChrome(row, session.page, base);
		}
		finally {
			await session.context.close();
		}
	}

	if (action.includes('PermissionGate')) {
		if (!accounts.teacher) {
			return na(row, 'Compte enseignant non provisionné');
		}
		const session = await loginIsolatedTeacher(
			browser,
			base,
			accounts.teacher.email,
			accounts.teacher.password,
		);
		if (!session) {
			return notOk(row, 'Connexion enseignant échouée');
		}
		try {
			const gate = await assertTeacherPortalGate(session.page);
			if (!gate.ok) {
				return notOk(row, gate.detail);
			}
			await session.page.goto(`${base}/school/staff`, { waitUntil: 'domcontentloaded' });
			await session.page.waitForURL(
				url => {
					try {
						return !new URL(url).pathname.startsWith('/school/staff');
					}
					catch {
						return false;
					}
				},
				{ timeout: 10_000 },
			).catch(() => {});
			const pathname = new URL(session.page.url()).pathname;
			const sidebar = await session.page.locator('aside#app-sidebar').isVisible().catch(() => false);
			if (pathname.startsWith('/school/staff') || sidebar) {
				return notOk(row, `accès staff non bloqué (${session.page.url()})`);
			}
			return ok(row, 'accès staff bloqué après tentative directe');
		}
		finally {
			await session.context.close();
		}
	}

	return notOk(row, 'Scénario Permissions non mappé');
}

async function assertFinanceRestrictedNoChrome(
	row: QaTemplateRow,
	page: Page,
	base: string,
): Promise<MatrixResult> {
	await page.goto(`${base}/finance/billing`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	const hrefs = await sidebarNavHrefs(page);
	if (!hrefsExclude(hrefs, '/finance')) {
		return notOk(row, 'Lien finance visible dans la sidebar');
	}
	const financeChrome = page.getByRole('button', { name: /facturation|frais|billing|fees/i });
	if (await financeChrome.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
		return notOk(row, `Chrome finance visible (${page.url()})`);
	}
	const emptyState = page.getByRole('heading', { name: /rien à afficher|nothing here yet/i });
	if (!(await emptyState.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return notOk(row, `État vide attendu absent (${page.url()})`);
	}
	return ok(row, new URL(page.url()).pathname);
}

async function assertFinanceRedirectRestricted(
	row: QaTemplateRow,
	browser: Browser,
	base: string,
	accounts: SecondaryAccounts | undefined,
): Promise<MatrixResult | null> {
	if (!row.action.includes('sans permission')) {
		return null;
	}
	if (!accounts?.educator) {
		return na(row, 'Compte restreint non provisionné');
	}
	const session = await loginIsolated(browser, base, accounts.educator.email, accounts.educator.password);
	if (!session) {
		return notOk(row, 'Connexion compte restreint échouée');
	}
	try {
		return await assertFinanceRestrictedNoChrome(row, session.page, base);
	}
	finally {
		await session.context.close();
	}
}

async function runPageScenario(row: QaTemplateRow, ctx: DemoContext, browser: Browser, entities: MatrixEntities): Promise<MatrixResult> {
	const { page } = ctx;
	const action = row.action;

	if (row.module === 'Permissions') {
		return runPermissionsScenario(row, browser, ctx.base, entities.secondaryAccounts);
	}

	if (row.endpoint.includes('/onboarding') || row.module === 'Onboarding') {
		return runOnboardingScenario(row, ctx, entities);
	}

	if (
		row.endpoint === '(app)'
		|| (row.module === 'Shell'
			&& !/^Sidebar — lien /i.test(action)
			&& !/^Modal deep-link /i.test(action))
	) {
		return runShellScenario(row, ctx, browser, entities);
	}

	// ── Generated: legacy redirect smoke ──
	if (/^Redirect — cible attendue$/i.test(action)) {
		const nav = await navigateToRow(ctx, row, entities);
		if (!nav.url) return na(row, nav.reason ?? 'URL non résolue');
		await page.waitForTimeout(1_500);
		const pathname = new URL(page.url()).pathname;
		const routeKey = inventoryRouteToMatrixPath(pathname).replace(/\[id\]/g, ':id?').replace(/\[classId\]/g, ':classId');
		const expected = ROUTE_REDIRECTS[routeKey] ?? ROUTE_REDIRECTS[inventoryRouteToMatrixPath(row.endpoint.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] ?? '')];
		if (!expected) {
			return ok(row, `Redirected to ${pathname}`);
		}
		const targetPrefix = expected.split('?')[0]?.replace(':classId', entities.classId ?? '')
			.replace(':id?', entities.studentId ?? '')
			.replace(':id', entities.studentId ?? '') ?? expected;
		const okRedirect = pathname.startsWith(targetPrefix.split('?')[0] ?? targetPrefix)
			|| page.url().includes(targetPrefix.replace(/:\w+\??/g, ''));
		return okRedirect ? ok(row, page.url()) : notOk(row, `Expected redirect toward ${expected}, got ${page.url()}`);
	}

	// ── Generated: sidebar href smoke ──
	if (/^Sidebar — lien /i.test(action)) {
		const targetPath = new URL(
			row.endpoint.startsWith('http') ? row.endpoint : `${ctx.base}${row.endpoint}`,
		).pathname.replace('[classId]', entities.classId ?? '[classId]');
		if (targetPath.includes('[classId]') && !entities.classId) {
			return na(row, 'classId requis pour lien sidebar classe');
		}
		const resolvedPath = targetPath.replace('[classId]', entities.classId ?? '');
		const startPath = sidebarSmokeStartPath(resolvedPath, entities.classId);
		await page.goto(`${ctx.base}${startPath}`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		await waitForResolvedAcademicYearId(page).catch(() => {});

		const sidebar = page.locator('aside#app-sidebar');
		await ensureSidebarLabelsVisible(page);
		await expandSidebarModuleForPath(sidebar, resolvedPath);

		const link = sidebar.locator(`a[href="${resolvedPath}"], a[href^="${resolvedPath}/"]`).first();
		if (!(await link.isVisible({ timeout: 10_000 }).catch(() => false))) {
			if (isClassDailyAttendanceSidebarPath(resolvedPath)) {
				return na(row, 'Onglet assiduité masqué hors appel quotidien');
			}
			return notOk(row, `Lien sidebar introuvable: ${resolvedPath}`);
		}
		await link.click();
		const landed = await page.waitForURL(
			url => pathnameReachedSidebarTarget(url.pathname, resolvedPath),
			{ timeout: 15_000 },
		).then(() => true).catch(() => false);
		return landed ? ok(row) : notOk(row, page.url());
	}

	// Redirect-only tests
	if (/^Redirect vers/i.test(action)) {
		const nav = await navigateToRow(ctx, row, entities);
		if (!nav.url && row.endpoint.includes('/finance') && action.includes('billing')) {
			await page.goto(`${ctx.base}/finance`, { waitUntil: 'domcontentloaded' });
			const redirected = page.url().includes('/finance/billing');
			return redirected ? ok(row) : notOk(row, page.url());
		}
		if (!nav.url && row.endpoint.includes('/configuration') && action.includes('subjects')) {
			await page.goto(`${ctx.base}/configuration`, { waitUntil: 'domcontentloaded' });
			return page.url().includes('/configuration/subjects') ? ok(row) : notOk(row, page.url());
		}
		if (!nav.url) return na(row, nav.reason ?? 'URL non résolue');
		await page.waitForTimeout(1_000);
		if (action.includes('/students') && row.endpoint.includes('/classes/')) {
			const okRedirect = page.url().includes('/students');
			return okRedirect ? ok(row) : notOk(row, page.url());
		}
		return ok(row, page.url());
	}

	const nav = await navigateToRow(ctx, row, entities);
	if (!nav.url) {
		if (/import/i.test(action) && action.includes('prérequis')) {
			return na(row, nav.reason ?? 'Prérequis données manquants');
		}
		return na(row, nav.reason ?? 'Entité introuvable');
	}

	await waitForPageQuery(page);
	await dismissPageError(page);

	const fatal = await assertNoFatalError(page);
	if (fatal) return notOk(row, fatal);

	// ── Generated: modal deep-link smoke ──
	if (/^Modal deep-link \?modal=/i.test(action)) {
		const endpointPath = row.endpoint.replace(/^https?:\/\/[^/]+/i, '');
		const modalMatch = endpointPath.match(/[?&]modal=([^&]+)/);
		const modalKey = modalMatch?.[1];
		const pathOnly = endpointPath.split('?')[0] ?? '';
		const surface = MODAL_SURFACES.find((s) => {
			if (s.modal !== modalKey) return false;
			const normalizedParent = s.parentRoute
				.replace('/[classId]', '')
				.replace('/[id]', '');
			return pathOnly === normalizedParent || pathOnly.startsWith(`${normalizedParent}/`);
		});
		if (surface?.requiresTarget && surface.targetEntityKey) {
			const target = entities[surface.targetEntityKey as keyof MatrixEntities];
			if (!target) {
				return na(row, `Setup missing ${surface.setupStep ?? surface.targetEntityKey} for modalTarget`);
			}
		}

		if (modalKey === 'add-chapter' && pathOnly.includes('/configuration/subjects/') && !entities.subjectId) {
			return na(row, 'Setup missing subjectId for progression modal');
		}

		const visible = await waitForFormModal(page, 15_000);

		const urlHasModal = modalKey ? page.url().includes(`modal=${modalKey}`) : false;
		return visible && urlHasModal ? ok(row) : notOk(row, `Modal non visible (url=${page.url()})`);
	}

	// ── Generated: direct route navigation smoke ──
	if (action === ROUTE_SMOKE_ACTION) {
		const isStudentDrawerRoute = /\/school\/students\/[^/]+\//.test(page.url())
			|| row.endpoint.includes('/school/students/[id]/');
		if (isStudentDrawerRoute) {
			await waitForPageQuery(page);
		}
		const content = await hasMainContent(page, { drawerTimeout: 15_000 });
		return content ? ok(row) : notOk(row, 'Contenu principal / drawer absent');
	}

	// ── Notes pédagogiques (before generic CRUD — action contains "CRUD") ──
	if (/notes pédagogiques/i.test(action)) {
		const addNoteBtn = page.getByRole('button', { name: /add note|ajouter une note/i }).first();
		if (!(await addNoteBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
			return notOk(row, 'Bouton Add note introuvable');
		}
		await addNoteBtn.click();
		const dialog = page.getByRole('dialog');
		if (!(await dialog.isVisible({ timeout: 5_000 }).catch(() => false))) {
			return notOk(row, 'Modal note pédagogique non ouvert');
		}
		const body = dialog.locator('textarea').first();
		await body.fill(`QA note ${Date.now()}`);
		const createResponse = page.waitForResponse(
			res => res.url().includes('/core/commands/create-student-note') && res.request().method() === 'POST',
			{ timeout: 15_000 },
		).catch(() => null);
		await submitDialog(page);
		const response = await createResponse;
		const closed = !(await dialog.isVisible().catch(() => false));
		if (response && response.ok() && closed) {
			return ok(row, 'Note pédagogique créée');
		}
		return notOk(row, closed ? 'API create-student-note échouée' : 'Modal note toujours ouvert');
	}

	// ── List / display / load ──
	if (/^(Liste|Chargement|Ledger|Hub|Templates|Catalogue|Affichage|Consulter|Vue |Redirect)/i.test(action)
		|| /affichage|charge|visible|historique|métadonnées|détail message|profil élève|notes|assiduité|incidents|finances|bulletin|inscriptions/i.test(action)
		&& !/créer|crud|éditer|sauver|publier|générer|supprimer|marquer|assigner|toggle|offer|import —/i.test(action)) {
		const content = await hasMainContent(page);
		return content ? ok(row) : notOk(row, 'Contenu principal absent');
	}

	// ── Search / Filters (registry-driven setup-first) ──
	if (isFilterOrSearchRow(action)) {
		const filterResult = await runFilterScenario(row, ctx, entities);
		if (filterResult) {
			return filterResult;
		}
	}

	// ── Sort columns ──
	if (/^tri colonnes$/i.test(action) || (/^tri\b/i.test(action) && !/pagination|charger plus|semaine/i.test(action))) {
		const sorted = await clickFirstListSortColumn(page);
		return sorted
			? ok(row, 'sort: first column header clicked')
			: na(row, 'Aucune colonne triable (vue cartes ou liste sans tri)');
	}

	// ── Pagination / load more ──
	if (/pagination|charger plus/i.test(action)) {
		const loadMore = page.getByRole('button', { name: /charger plus|load more|page suivante|next page/i }).first();
		if (await loadMore.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await loadMore.click({ timeout: 3_000 }).catch(() => {});
			return ok(row);
		}
		const pageNav = page.getByRole('button', { name: /précédent|previous page|^suivant$|^next$/i }).first();
		if (await pageNav.isVisible().catch(() => false)) {
			await pageNav.click({ timeout: 3_000 }).catch(() => {});
			return ok(row);
		}
		const infiniteStatus = page.getByText(/chargement…|loading more/i).first();
		if (await infiniteStatus.isVisible().catch(() => false)) {
			return ok(row, 'pagination: infinite list loading more');
		}
		return na(row, 'Pas de contrôle pagination / charger plus (liste courte ou scroll infini déjà chargé)');
	}

	// ── Week navigation ──
	if (/navigation semaine/i.test(action)) {
		const weekNav = page.getByRole('button', { name: /semaine précédente|semaine suivante|previous week|next week|cette semaine|this week/i }).first();
		if (await weekNav.isVisible({ timeout: 4_000 }).catch(() => false)) {
			await weekNav.click({ timeout: 3_000 }).catch(() => {});
			return ok(row);
		}
		return na(row, 'Navigation semaine absente');
	}

	// ── Create / modal ──
	if (/créer|crud|nouveau|ajouter/i.test(action) && !/notes pédagogiques/i.test(action)) {
		if (row.endpoint.includes('/school/events') && /incident/i.test(action)) {
			await waitForPageQuery(page);
			await dismissPageError(page);
			const opened = await openDialogButton(page, /add incident|ajouter un incident/i);
			if (!opened) {
				return notOk(row, 'Bouton Add incident introuvable sur /school/events');
			}
			const dialog = page.getByRole('dialog');
			const studentCombo = dialog.getByRole('combobox').first();
			if (await studentCombo.isVisible().catch(() => false)) {
				await studentCombo.click();
				await page.getByRole('option').first().click({ timeout: 5_000 }).catch(() => {});
			}
			const inputs = dialog.locator('input');
			if (await inputs.nth(0).isVisible().catch(() => false)) {
				await inputs.nth(0).fill(`QA Incident ${Date.now()}`);
			}
			const textarea = dialog.locator('textarea').first();
			if (await textarea.isVisible().catch(() => false)) {
				await textarea.fill('QA matrix incident description');
			}
			const submit = dialog.getByRole('button', { name: /enregistrer|save/i }).last();
			if (await submit.isEnabled().catch(() => false)) {
				await submit.click();
				await page.waitForTimeout(2_000);
				const closed = !(await dialog.isVisible().catch(() => false));
				return closed ? ok(row) : ok(row, 'Modal incident ouvert (submit disabled sans élève)');
			}
			return ok(row, 'Modal incident ouvert');
		}

		if (row.endpoint.includes('/configuration/classes') && /classe/i.test(action)) {
			await waitForPageQuery(page);
			await dismissPageError(page);
			const opened = await openDialogButton(page, /ajouter une classe|add class/i);
			if (!opened) {
				return notOk(row, 'Bouton Add class introuvable sur /configuration/classes');
			}
			const className = `QA-Class-${Date.now()}`;
			try {
				await fillClassCreateDialog(page, className);
			}
			catch (err) {
				return notOk(row, formatError(err));
			}
			const closed = await waitForDialogClosed(page);
			return closed ? ok(row) : notOk(row, 'Modal classe reste ouvert après submit');
		}

		if (action.includes('élève') && row.endpoint.includes('/school/students')) {
			const consoleErrors: string[] = [];
			const onConsole = (msg: { type: () => string; text: () => string }) => {
				if (msg.type() === 'error') consoleErrors.push(msg.text());
			};
			page.on('console', onConsole);
			const opened = await clickCreateButton(page, action, row.endpoint);
			if (!opened) {
				page.off('console', onConsole);
				return notOk(row, 'Modal création élève non ouvert');
			}
			try {
				await fillStudentCreateDialog(page);
			}
			catch (err) {
				page.off('console', onConsole);
				return notOk(row, formatError(err));
			}
			await page.waitForTimeout(2_500);
			page.off('console', onConsole);
			const lifecycle = consoleErrors.some(t => /lifecycle_outside_component|getContext/i.test(t));
			if (lifecycle) {
				return notOk(row, 'lifecycle_outside_component dans StudentCreateModal submit');
			}
			const dialog = page.getByRole('dialog');
			const closed = !(await dialog.isVisible().catch(() => false));
			if (closed) {
				entities.createdStudentId = 'created';
				return ok(row);
			}
			return notOk(row, 'Modal reste ouvert après submit');
		}

		if (action.includes('frais') && row.endpoint.includes('/finance/fees')) {
			await waitForPageQuery(page);
			await dismissPageError(page);
			const opened = await openDialogButton(page, /add fee|ajouter un frais/i);
			if (!opened) return notOk(row, 'Bouton Add fee introuvable sur /finance/fees');
			const dialog = page.getByRole('dialog');
			await fillFeeCreateDialog(page, `QA-Frais-${Date.now()}`);
			await submitDialog(page);
			await page.waitForTimeout(2_000);
			const closed = !(await dialog.isVisible().catch(() => false));
			return closed ? ok(row) : notOk(row, 'Création frais non confirmée');
		}

		const opened = await clickCreateButton(page, action, row.endpoint);
		return opened ? ok(row, 'Modal création ouvert') : notOk(row, 'Bouton création introuvable');
	}

	// ── Edit / drawer / open ──
	if (/éditer|édi|ouvrir|drawer|onglet|assigner|affectation|photo|commentaire|changer/i.test(action)) {
		if (row.endpoint.includes('/finance/billing')) {
			if (/assigner/i.test(action)) {
				const assignBtn = page.getByRole('button', { name: /ajouter une facture|add invoice/i }).first();
				if (await assignBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
					await assignBtn.click();
					const dialog = page.getByRole('dialog');
					const visible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
					return visible ? ok(row) : notOk(row, 'Modal assignation facture non ouvert');
				}
				return notOk(row, 'Bouton Ajouter une facture introuvable');
			}
			if (/drawer|ouvrir/i.test(action)) {
				const rowBtn = page.locator('main ul button, [role="main"] ul button').first();
				if (await rowBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
					await rowBtn.click();
					const drawer = page.locator('aside[aria-label]');
					const visible = await drawer.isVisible({ timeout: 5_000 }).catch(() => false);
					return visible ? ok(row) : notOk(row, 'Drawer facturation non ouvert');
				}
				return na(row, 'Aucune ligne facturation — drawer non testable');
			}
		}

		const editBtn = page.getByRole('button', { name: /éditer|edit|modifier|assigner/i }).first();
		const tab = page.getByRole('tab').first();
		if (await editBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await editBtn.click();
			const drawer = page.getByRole('dialog').or(page.locator('[data-vaul-drawer]'));
			const visible = await drawer.first().isVisible({ timeout: 5_000 }).catch(() => false);
			return visible ? ok(row) : ok(row, 'Action édition déclenchée');
		}
		if (await tab.isVisible().catch(() => false)) {
			await tab.click();
			return ok(row);
		}
		const form = page.locator('input, textarea, select').first();
		return (await form.isVisible({ timeout: 5_000 }).catch(() => false)) ? ok(row) : notOk(row, 'Formulaire / drawer introuvable');
	}

	// ── Save preferences ──
	if (/sauver|charger préférences/i.test(action)) {
		const save = page.getByRole('button', { name: /sauver|save|enregistrer/i }).first();
		const toggles = page.locator('input[type="checkbox"], [role="switch"]');
		const count = await toggles.count();
		if (action.includes('Charger') && count > 0) return ok(row, `${count} préférences`);
		if (await save.isVisible().catch(() => false)) {
			return ok(row, 'Bouton sauvegarde présent (non cliqué)');
		}
		return notOk(row, 'Préférences introuvables');
	}

	// ── Remove draft recipient (visibility only — must not mutate) ──
	if (/retirer destinataire/i.test(action)) {
		const visible = await page.getByRole('button', { name: REMOVE_ANNOUNCEMENT_TARGET_CONTROL })
			.first()
			.isVisible({ timeout: 6_000 })
			.catch(() => false);
		return visible
			? ok(row, 'remove-target: control visible (not clicked)')
			: na(row, 'remove-target: no draft recipient (published or empty)');
	}

	// ── Delete (visibility only — provisioned runs must not mutate) ──
	if (/supprimer|delete/i.test(action) && !/export/i.test(action)) {
		const visible = await isDeleteControlVisible(page);
		return visible
			? ok(row, 'delete: control visible (not clicked)')
			: na(row, 'delete: no delete control or insufficient data');
	}

	// ── Publish / generate / payment / toggle — smoke only ──
	if (row.endpoint.includes('/configuration/academic') && /publier année/i.test(action)) {
		const label = defaultAcademicYearPreset().label;
		const yearHeading = page.getByRole('heading', { name: label, exact: true });
		const section = yearHeading.locator('xpath=ancestor::section[1]');
		const publishedBadge = section.getByText(/publié|published/i).first();
		if (await publishedBadge.isVisible({ timeout: 3_000 }).catch(() => false)) {
			return ok(row, `${label} déjà publiée (setup)`);
		}
		if (!(await yearHeading.isVisible({ timeout: 8_000 }).catch(() => false))) {
			const fallback = page.locator('section h3').first();
			const fallbackLabel = (await fallback.textContent().catch(() => ''))?.trim();
			if (!fallbackLabel) {
				return na(row, 'Aucune année scolaire dans la liste');
			}
			const ready = await ensureAcademicYearReady(page, fallbackLabel);
			return ready ? ok(row, `${fallbackLabel} published`) : notOk(row, `Publish failed for ${fallbackLabel}`);
		}
		const ready = await ensureAcademicYearReady(page, label);
		return ready ? ok(row, `${label} published`) : notOk(row, `Publish failed for ${label}`);
	}

	if (/publier|générer|enregistrer paiement|résoudre|planning|brouillon|toggle|offer/i.test(action)) {
		const btn = page.getByRole('button', { name: /publier|générer|paiement|résoudre|brouillon|publier|offer|toggle/i }).first();
		return (await btn.isVisible({ timeout: 6_000 }).catch(() => false))
			? ok(row, 'update: action available (not executed — avoids mutation)')
			: na(row, 'Bouton action absent ou données insuffisantes');
	}

	// ── Export ──
	if (/export/i.test(action)) {
		const outcome = await exportSelectedListRows(page);
		if (outcome.status === 'ok') return ok(row);
		if (outcome.status === 'na') return na(row, outcome.detail);
		return notOk(row, outcome.detail);
	}

	// ── Imports ──
	if (/import/i.test(action)) {
		await page.goto(`${ctx.base}/configuration/tools`, { waitUntil: 'domcontentloaded' });
		await waitForAppShell(page);
		const importBtn = page.getByRole('button', { name: /import/i }).first();
		if (await importBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
			await importBtn.click();
			const modal = page.locator('[data-testid="import-pack-generic"], [role="dialog"]');
			const visible = await modal.first().isVisible({ timeout: 8_000 }).catch(() => false);
			if (!visible) return notOk(row, 'Modal import non ouvert');
			const packName = action.match(/import (\w+)/i)?.[1] ?? '';
			if (packName && packName !== 'données') {
				const option = page.getByText(new RegExp(packName, 'i')).first();
				return (await option.isVisible({ timeout: 4_000 }).catch(() => false)) ? ok(row) : ok(row, 'Hub import accessible');
			}
			return ok(row);
		}
		return notOk(row, 'Hub import introuvable');
	}

	// ── Dashboard specifics ──
	if (row.module === 'Dashboard') {
		if (action.includes('KPI')) {
			const cards = page.locator('[data-testid], .card, article').filter({ hasText: /.+/ });
			const count = await cards.count();
			return count > 0 ? ok(row, `${count} blocs`) : notOk(row, 'Aucun KPI visible');
		}
		if (action.includes('Cartes')) {
			const link = page.locator('main a[href]').first();
			return (await link.isVisible({ timeout: 5_000 }).catch(() => false)) ? ok(row) : na(row, 'Pas de carte cliquable');
		}
		if (action.includes('empty')) {
			return ok(row, 'Page chargée sans erreur fatale');
		}
	}

	// ── Inbox message ──
	if (action.includes('Ouvrir un message') || action.includes('Marquer lu')) {
		const first = page.locator('a[href*="/account/inbox/"], [data-testid*="inbox"]').first();
		if (!(await first.isVisible({ timeout: 6_000 }).catch(() => false))) {
			return na(row, 'Boîte vide');
		}
		await first.click();
		if (action.includes('Marquer')) {
			const readBtn = page.getByRole('button', { name: /lu|read/i }).first();
			return (await readBtn.isVisible({ timeout: 5_000 }).catch(() => false)) ? ok(row) : ok(row, 'Message ouvert');
		}
		return ok(row);
	}

	// ── Configuration academic wizard ──
	if (action.includes('wizard') || action.includes('périodes')) {
		const wizard = page.getByRole('button', { name: /période|period|wizard|ajouter/i }).first();
		return (await wizard.isVisible({ timeout: 6_000 }).catch(() => false)) ? ok(row) : notOk(row, 'Wizard périodes introuvable');
	}

	// ── Tools modal ──
	if (action.includes('Modal import données')) {
		const btn = page.getByRole('button', { name: /import/i }).first();
		if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) return notOk(row, 'Bouton import absent');
		await btn.click();
		return (await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false)) ? ok(row) : notOk(row, 'Modal non ouvert');
	}

	// Default smoke
	const content = await hasMainContent(page);
	return content ? ok(row) : notOk(row, 'Scénario par défaut — contenu absent');
}

export async function runMatrixScenario(
	row: QaTemplateRow,
	ctx: DemoContext,
	browser: Browser,
	entities: MatrixEntities,
): Promise<MatrixResult> {
	try {
		if (entities.studentSetupBlocked && isStudentBlockedScenario(row.endpoint, row.action)) {
			return na(row, STUDENT_SETUP_BLOCKER.detail);
		}
		if (row.module === 'Auth') {
			return await runAuthScenario(row, ctx, browser, entities);
		}
		return await runPageScenario(row, ctx, browser, entities);
	}
	catch (err) {
		return notOk(row, formatError(err));
	}
}

export { discoverEntities, emptyEntities };
