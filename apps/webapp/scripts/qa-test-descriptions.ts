/**
 * Human-readable test procedure + inputs for QA matrix Excel report.
 * Mirrors qa-matrix-scenarios.ts / filter-setup-registry.ts behaviour.
 */
import type { QaTemplateRow } from './qa-template-matrix.manual';
import { isExcludedMatrixRow } from './qa-matrix-exclusions';
import { MODAL_SURFACES } from './qa-route-catalog';

function pathOf(endpoint: string): string {
	if (endpoint === '(app)' || endpoint === '(multi-comptes)') return endpoint;
	const url = endpoint.startsWith('http') ? endpoint : `http://localhost:5173${endpoint}`;
	return new URL(url).pathname + (url.includes('?') ? url.slice(url.indexOf('?')) : '');
}

function modalKey(endpoint: string): string | null {
	const m = endpoint.match(/[?&]modal=([^&]+)/);
	return m?.[1] ?? null;
}

export function logTrace(row: QaTemplateRow, statut: string): string {
	const sym = statut === 'OK' ? '✓' : statut === 'N/A' ? '○' : statut === 'NOT OK' ? '✗' : '·';
	return `${sym} [${row.module}] ${row.action}`;
}

export function describeTestExactly(row: QaTemplateRow): string {
	const action = row.action;
	const ep = pathOf(row.endpoint);
	const modal = modalKey(row.endpoint);

	if (row.module === 'Auth') {
		if (action.includes('Redirect')) return 'Navigate to route; assert browser redirects to /login.';
		if (action.includes('succès')) return 'Fill #login-password-email + #login-password; click Se connecter; assert URL leaves /login.';
		if (action.includes('erreur')) return 'Submit login with wrong password; assert inline error message visible.';
		if (action.includes('Banner API')) return 'Load /login; assert API connection banner state matches /auth/get-session.';
		if (action.includes('démo')) return 'Open /login/demo; click demo persona button; assert redirect to app shell.';
		if (action.includes('invitation')) return 'Open /invite/[token]; assert signup/login flow or error for token.';
		return 'Auth page smoke — form controls and navigation.';
	}

	if (row.module === 'Onboarding') {
		return `Onboarding wizard step at ${ep}: load page, assert step UI and submit controls (manual module).`;
	}

	if (row.module === 'Shell' && row.endpoint === '(app)') {
		if (action.includes('Sidebar') && !action.includes('lien')) {
			return 'goto /dashboard; wait aside#app-sidebar; count nav links (>2).';
		}
		if (action.includes('année scolaire')) {
			return 'goto /dashboard; waitForAppShell + waitForResolvedAcademicYearId; assert [data-testid=academic-year-trigger] visible (10s).';
		}
		if (action.includes('Sélecteur école')) return 'Assert school selector button visible (multi-school tenants).';
		if (action.includes('langue')) return 'Click FR/EN language toggle in header.';
		if (action.includes('Avatar')) return 'Open user menu / profile modal from header avatar.';
		if (action.includes('account-profile')) {
			return 'goto /dashboard?modal=account-profile; assert dialog visible and URL contains modal=account-profile.';
		}
		if (action.includes('Logout')) return 'Skipped — would destroy session for remaining tests.';
		if (action.includes('permission')) return 'Navigate restricted URL; expect redirect to /dashboard (needs low-permission account).';
		return 'Shell layout / header control smoke.';
	}

	if (/^Sidebar — lien /i.test(action)) {
		return `goto /dashboard; expand sidebar module; click a[href="${ep.replace('[classId]', '{classId}')}"]; assert URL contains target path.`;
	}

	if (/^Modal deep-link \?modal=/i.test(action)) {
		const surface = MODAL_SURFACES.find(s => s.modal === modal && ep.startsWith(s.parentRoute.replace('/[id]', '').replace('/[classId]', '')));
		const targetNote = surface?.requiresTarget
			? `Requires modalTarget from setup (${surface.setupStep ?? surface.targetEntityKey}).`
			: 'Create/singleton modal — no modalTarget required.';
		return `goto resolved URL ${ep}; wait 8s; assert [role=dialog] or [data-testid=form-modal] visible AND URL still contains modal=${modal}. ${targetNote}`;
	}

	if (action === 'Navigation directe — contenu visible') {
		return `Cold-navigate to ${ep}; waitForPageQuery; assert main/table/[data-testid] OR aside[aria-label] drawer visible (15s for student routes).`;
	}

	if (/^Redirect — cible attendue$/i.test(action)) {
		return `Navigate to ${ep}; assert pathname matches catalog redirect target (e.g. namespace root → default child).`;
	}

	if (/notes pédagogiques/i.test(action)) {
		return 'On student profile: click Add note; fill textarea; submitDialog (form-modal-submit); wait POST create-student-note; assert modal closes.';
	}

	if (isFilterOrSearchAction(action)) {
		return describeFilterTest(row);
	}

	if (/tri|pagination|charger plus|navigation semaine/i.test(action)) {
		return 'Click first sortable column header, Load more, or week nav button; N/A if list too short.';
	}

	if (/créer|crud|nouveau|ajouter/i.test(action) && !/notes pédagogiques/i.test(action)) {
		if (ep.includes('/school/events')) return 'Open Add incident dialog; fill fields; submit if enabled.';
		if (ep.includes('/configuration/classes')) return 'Open Add class dialog; fillClassCreateDialog; assert modal closes.';
		if (action.includes('élève') && ep.includes('/school/students')) {
			return 'clickCreateButton; fillStudentCreateDialog; assert no lifecycle console error; modal closes.';
		}
		if (action.includes('frais')) return 'Open Add fee modal; fill name + amount 10000; submitDialog.';
		return 'clickCreateButton / openDialogButton; assert creation modal opens.';
	}

	if (/éditer|drawer|onglet|assigner|photo|changer/i.test(action)) {
		return 'Click Edit / tab / Assign button; assert dialog or drawer opens; or form fields visible.';
	}

	if (/sauver|charger préférences/i.test(action)) {
		return 'Account preferences: assert toggles loaded or Save button present (save not clicked).';
	}

	if (/supprimer|delete/i.test(action)) {
		return 'Assert delete button or menu item visible; confirm dialog if opened — mutation NOT submitted.';
	}

	if (ep.includes('/configuration/academic') && /publier année/i.test(action)) {
		return 'ensureAcademicYearReady: find year section; click Publier; confirm dialog; assert Published badge.';
	}

	if (/publier|générer|enregistrer paiement|résoudre|toggle|offer/i.test(action)) {
		return 'Assert action button visible (publish/generate/payment/resolve) — button NOT clicked to avoid mutation.';
	}

	if (/export/i.test(action)) return 'Assert Export button visible (needs row selection).';

	if (/import/i.test(action)) {
		return 'goto /configuration/tools; open import hub modal; assert pack option for action.';
	}

	if (row.module === 'Dashboard') {
		if (action.includes('KPI')) return 'Count dashboard cards/articles with text.';
		if (action.includes('Cartes')) return 'Assert main contains clickable link card.';
		if (action.includes('Nudge')) return 'Homeroom attendance nudge — role/data dependent.';
		return 'Dashboard loaded without fatal error.';
	}

	if (row.module === 'Permissions') {
		return 'Permission-gated UI — needs teacher/educator accounts (not provisioned).';
	}

	if (/^(Liste|Chargement|Ledger|Affichage|Consulter)/i.test(action) || /affichage|historique|métadonnées/i.test(action)) {
		return `Navigate ${ep}; waitForPageQuery; hasMainContent (main/table/testid, 8s).`;
	}

	return `Default smoke: navigate ${ep}; assert page content visible without fatal error.`;
}

function isFilterOrSearchAction(action: string): boolean {
	return /filtre/i.test(action) || action === 'Recherche' || action === 'Liste — affichage / recherche';
}

function describeFilterTest(row: QaTemplateRow): string {
	const ep = pathOf(row.endpoint);
	const action = row.action;

	if (ep === '/school/students' && action.includes('Filtre statut')) {
		return 'For status=active|inactive|archived: goto ?status=; assert fixture student lastName visible in table.';
	}
	if (ep === '/school/students' && action.includes('Filtre classe')) {
		return 'goto ?classGroupId={classId}; assert searchToken student row visible in filtered list.';
	}
	if (ep === '/school/students' && action === 'Recherche') {
		return 'Fill [data-testid=list-search] with searchToken; assert matching row visible.';
	}
	if (ep === '/school/calendar' && /filtre/i.test(action)) {
		return 'For each calendar type fixture: select filter or ?type=; assert event title in list.';
	}
	if (ep.includes('/announcements') && /filtre statut/i.test(action)) {
		return 'Assert draft announcement title visible in status-filtered list.';
	}
	if (ep.includes('/classes/') && ep.endsWith('/students') && action === 'Filtres') {
		return 'Class-scoped student list: open status combobox if present.';
	}
	if (ep.includes('/evaluations') && /filtre type/i.test(action)) {
		return 'Open evaluation type filter combobox; select first option.';
	}
	if (ep.includes('/attendance') && /filtre completion/i.test(action)) {
		return 'Open attendance completion filter combobox.';
	}
	if (ep.includes('/report-cards') && /filtre statut/i.test(action)) {
		return 'Open report-card status filter combobox.';
	}
	if (ep.includes('/teaching') && action === 'Recherche') {
		return 'Search teaching list with teachingSearchToken or searchToken.';
	}
	if (ep === '/finance/fees' && /filtre catégorie/i.test(action)) {
		return 'Assert fee fixture visible; optionally change category combobox.';
	}
	if (ep === '/finance/payment' && /filtre statut/i.test(action)) {
		return 'Open payment status filter combobox.';
	}
	if (ep === '/finance/payment' && /filtre classe/i.test(action)) {
		return 'goto /finance/payment?classGroupId={classId}.';
	}
	if (ep === '/finance/payment' && action === 'Recherche') {
		return 'Fill payment ledger search with "E2E".';
	}
	if (ep === '/configuration/academic' && /filtres liste/i.test(action)) {
		return 'Academic years list: interact with status filter combobox/select.';
	}
	if (ep === '/configuration/subjects' && /filtre niveau/i.test(action)) {
		return 'goto ?gradeLevel={gradeLevelId}; assert subject fixture name in list.';
	}
	if (ep === '/configuration/discipline' && /filtre kind/i.test(action)) {
		return 'Assert discipline fixture entry visible; optional kind combobox.';
	}
	if (ep.includes('/activities') && /filtre/i.test(action)) {
		return 'Activities category filter combobox.';
	}
	if (action === 'Liste — affichage / recherche') {
		return 'List search field: type "E2E" or assert list loaded.';
	}
	return 'Filter/search scenario from filter-setup-registry.';
}

export function describeTestInputs(row: QaTemplateRow): string {
	const ep = pathOf(row.endpoint);
	const action = row.action;
	const modal = modalKey(row.endpoint);

	if (isExcludedMatrixRow(row)) {
		return 'Non exécuté en run auto (module/route manuel).';
	}

	if (row.module === 'Auth' && action.includes('succès')) {
		return 'QA_LOGIN_EMAIL, QA_LOGIN_PASSWORD (provisioned fixture) or demo credentials.';
	}

	if (/^Modal deep-link/i.test(action)) {
		const q = row.endpoint.includes('?') ? row.endpoint.split('?')[1] : '';
		const surface = MODAL_SURFACES.find(s => s.modal === modal);
		if (surface?.requiresTarget) {
			return `URL: ${ep} + modalTarget from entities (${surface.targetEntityKey ?? surface.setupStep ?? 'setup'})`;
		}
		return `URL query: ${q || `modal=${modal}`}; resolved entity ids: classId, studentId, etc.`;
	}

	if (/^Sidebar — lien /i.test(action)) {
		return `classId={setup class}; href=${ep}`;
	}

	if (action === 'Navigation directe — contenu visible') {
		return `Resolved URL with studentId/classId/guardianId from entities.json or discoverEntities().`;
	}

	if (ep === '/school/students' && action.includes('Filtre statut')) {
		return 'URL ?status=active|inactive|archived; fixtures studentsByStatus.{status}.lastName';
	}
	if (ep === '/school/students' && action.includes('Filtre classe')) {
		return 'URL ?classGroupId={classId}; filterFixtures.searchToken';
	}
	if (ep === '/school/students' && action === 'Recherche') {
		return 'filterFixtures.searchToken → [data-testid=list-search]';
	}
	if (ep === '/school/calendar' && /filtre/i.test(action)) {
		return 'filterFixtures.calendarByType[type].title; URL ?type= or list-filter';
	}
	if (ep === '/configuration/subjects' && /filtre niveau/i.test(action)) {
		return 'URL ?gradeLevel={gradeLevelId}; filterFixtures.subjectsByGradeLevel[name]';
	}
	if (ep === '/finance/payment' && /filtre classe/i.test(action)) {
		return 'URL ?classGroupId={classId}';
	}
	if (action.includes('élève') && /créer/i.test(action)) {
		return 'Auto-filled student create dialog (E2E names); provisioned school/class context.';
	}
	if (/notes pédagogiques/i.test(action)) {
		return 'textarea: "QA note {timestamp}"; studentId in URL path.';
	}
	if (action.includes('frais')) {
		return 'Fee name QA-Frais-{ts}, amount 10000';
	}
	if (row.module === 'Shell' && action.includes('account-profile')) {
		return 'GET /dashboard?modal=account-profile';
	}

	if (/publier|générer|supprimer|export/i.test(action)) {
		return 'No mutation submitted — visibility-only smoke.';
	}

	return `Base: http://localhost:5173; login: provisioned tenant (.integration-run/fixture.json).`;
}

export function blockerDetail(statut: string, detail: string | undefined, row: QaTemplateRow): string {
	if (statut === 'OK') return '';
	if (statut === 'À faire' || statut === 'Manuel') return detail ?? '';
	if (statut === 'N/A') {
		return detail ?? 'Prérequis setup ou entité manquante — test honnêtement ignoré.';
	}
	// NOT OK
	const parts = [detail ?? 'Échec sans détail'];
	if (statut === 'NOT OK') {
		parts.push(`Module: ${row.module}`);
		parts.push(`Route: ${row.endpoint}`);
	}
	return parts.filter(Boolean).join(' | ');
}
