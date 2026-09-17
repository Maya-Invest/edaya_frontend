import { QA_TEMPLATE_MATRIX_MANUAL } from '../../../scripts/qa-template-matrix.manual';

export type CatalogCoverageKind = 'scene' | 'na';

export interface CatalogCoverageRow {
	module: 'Auth' | 'Onboarding';
	endpoint: string;
	action: string;
	kind: CatalogCoverageKind;
	scenes?: readonly string[];
	reason?: string;
}

export const AUTH_ONBOARDING_CATALOG_COVERAGE: readonly CatalogCoverageRow[] = [
	{ module: 'Auth', endpoint: '/', action: 'Redirect vers /login', kind: 'scene', scenes: ['unauthenticated-redirect'] },
	{ module: 'Auth', endpoint: '/login', action: 'Affichage page connexion', kind: 'scene', scenes: ['login-signup-ui'] },
	{ module: 'Auth', endpoint: '/login', action: 'Connexion mot de passe — succès', kind: 'scene', scenes: ['owner-relogin', 'invited-staff-relogin'] },
	{ module: 'Auth', endpoint: '/login', action: 'Connexion mot de passe — erreur visible (message rouge inline)', kind: 'scene', scenes: ['login-signup-ui'] },
	{ module: 'Auth', endpoint: '/login', action: 'Onglet signup (si activé)', kind: 'scene', scenes: ['login-signup-ui'] },
	{ module: 'Auth', endpoint: '/login', action: 'Banner API indisponible', kind: 'scene', scenes: ['api-unavailable-banner'] },
	{ module: 'Auth', endpoint: '/login/demo', action: 'Affichage comptes démo (dev)', kind: 'na', reason: 'canonical-lane-excludes-demo' },
	{ module: 'Auth', endpoint: '/login/demo', action: 'Connexion via picker démo', kind: 'na', reason: 'canonical-lane-excludes-demo' },
	{ module: 'Auth', endpoint: '/invite/[token]', action: 'Token invalide / expiré / révoqué', kind: 'scene', scenes: ['invalid-invite', 'invite-expired', 'invite-revoked'] },
	{ module: 'Auth', endpoint: '/invite/[token]', action: 'Acceptation invitation (signup ou login)', kind: 'scene', scenes: ['invited-staff', 'invited-staff-existing'] },
	{ module: 'Onboarding', endpoint: '/onboarding', action: 'Redirect vers ?step=1', kind: 'scene', scenes: ['login-signup-ui', 'happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=1', action: 'Formulaire profil école — validation', kind: 'scene', scenes: ['wizard-step-interactions'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=1', action: 'Submit étape 1', kind: 'scene', scenes: ['wizard-step-interactions', 'happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=1', action: 'Draft persisté après refresh', kind: 'scene', scenes: ['owner-wizard-resume'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=1', action: 'Type période trimestre — dates auto', kind: 'scene', scenes: ['school-period-dates'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=1', action: 'Type période semestre — dates S1 et S2 auto', kind: 'scene', scenes: ['school-period-dates'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=1', action: 'Ajout / suppression période', kind: 'scene', scenes: ['school-period-dates'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=2', action: 'Sélection template structure', kind: 'scene', scenes: ['wizard-step-interactions', 'happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=2', action: 'Drawer chapitres', kind: 'scene', scenes: ['wizard-step-interactions'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=2', action: 'Submit étape 2', kind: 'scene', scenes: ['wizard-step-interactions', 'happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=3', action: 'Ajouter invites staff', kind: 'scene', scenes: ['happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=3', action: 'Skip invites', kind: 'scene', scenes: ['wizard-step-interactions', 'owner-wizard-resume'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=3', action: 'Validation email', kind: 'scene', scenes: ['wizard-step-interactions'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=4', action: 'Résumé provision', kind: 'scene', scenes: ['wizard-step-interactions', 'happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding?step=4', action: 'Fin onboarding → application', kind: 'scene', scenes: ['happy-path'] },
	{ module: 'Onboarding', endpoint: '/onboarding', action: 'Navigation steps limitée à maxReachedStep', kind: 'scene', scenes: ['happy-path'] },
];

function catalogActionKey(module: string, endpoint: string, action: string): string {
	const path = endpoint.replace(/^https?:\/\/[^/]+/i, '') || '/';
	return `${module}::${path}::${action}`;
}

export function assertAuthOnboardingCatalogCoverage(sceneIds: readonly string[]): {
	automated: number;
	na: number;
	unique: number;
	excluded: number;
} {
	const sceneSet = new Set(sceneIds);
	const catalog = QA_TEMPLATE_MATRIX_MANUAL.filter(row => row.module === 'Auth' || row.module === 'Onboarding');
	const coverageByKey = new Map(
		AUTH_ONBOARDING_CATALOG_COVERAGE.map(row => [
			catalogActionKey(row.module, row.endpoint, row.action),
			row,
		]),
	);

	const missing: string[] = [];
	let automated = 0;
	let na = 0;

	for (const row of catalog) {
		const key = catalogActionKey(row.module, row.endpoint, row.action);
		const coverage = coverageByKey.get(key);
		if (!coverage) {
			missing.push(`${row.module} ${row.action} (unmapped)`);
			continue;
		}
		if (coverage.kind === 'na') {
			na += 1;
			continue;
		}
		const covered = (coverage.scenes ?? []).some(scene => sceneSet.has(scene));
		if (!covered) {
			missing.push(`${row.module} ${row.action} (need ${coverage.scenes?.join(', ')})`);
			continue;
		}
		automated += 1;
	}

	if (missing.length > 0) {
		throw new Error(`Uncovered release-required Auth/Onboarding catalog rows:\n- ${missing.join('\n- ')}`);
	}

	return {
		automated,
		na,
		unique: catalog.length,
		excluded: na,
	};
}
