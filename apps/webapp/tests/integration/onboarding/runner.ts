import type { Browser, Page } from 'playwright';
import { assertAuthOnboardingCatalogCoverage } from './catalog-coverage';
import { captureFailure, uniqueOnboardingEmail, uniqueOnboardingPassword } from './support/capture';
import { assertStackReady } from './support/auth';
import { ONBOARDING_WEBAPP_BASE } from './support/paths';
import { runApiUnavailableBanner } from './scenes/api-unavailable-banner';
import { assertPublicAuthGates } from './scenes/gates';
import { runHappyPath } from './scenes/happy-path';
import { runInvalidInvite } from './scenes/invalid-invite';
import { runInviteAlreadyAccepted } from './scenes/invite-already-accepted';
import { runInviteExpired } from './scenes/invite-expired';
import { runInviteRevoked } from './scenes/invite-revoked';
import { runInviteWrongAccount } from './scenes/invite-wrong-account';
import { runInvitedGuardian } from './scenes/invited-guardian';
import { runInvitedStaff } from './scenes/invited-staff';
import { runInvitedStaffExisting } from './scenes/invited-staff-existing';
import { runInvitedStaffRelogin } from './scenes/invited-staff-relogin';
import { runInvitedStaffSecondSchool } from './scenes/invited-staff-second-school';
import { runInvitedTeacher } from './scenes/invited-teacher';
import { runLoginSignupUi } from './scenes/login-signup-ui';
import { runOwnerRelogin } from './scenes/owner-relogin';
import { runOwnerWizardResume } from './scenes/owner-resume';
import { runProvisionBootstrapRetry } from './scenes/provision-bootstrap-retry';
import { runProvisionDoubleSubmit } from './scenes/provision-double-submit';
import { runSchoolPeriodDates } from './scenes/school-period-dates';
import { runSignupCrossTab } from './scenes/signup-cross-tab';
import { runWizardStepInteractions } from './scenes/wizard-interactions';
import type { OnboardingCredentials, OnboardingSuiteSummary } from './types';

export interface RunOnboardingSuiteOptions {
	browser: Browser;
	base?: string;
	outDir: string;
}

function uniqueOwner(name: string, schoolPrefix: string): OnboardingCredentials {
	return {
		email: uniqueOnboardingEmail(),
		password: uniqueOnboardingPassword(),
		name,
		schoolName: `${schoolPrefix} ${Date.now()}`,
		city: 'Abidjan',
	};
}

export async function runOnboardingSuite(
	options: RunOnboardingSuiteOptions,
): Promise<OnboardingSuiteSummary> {
	const base = options.base ?? ONBOARDING_WEBAPP_BASE;
	await assertStackReady(base);

	const owner = uniqueOwner('Onboarding Owner', 'Onboarding School');

	const summary: OnboardingSuiteSummary = {
		generatedAt: new Date().toISOString(),
		ok: true,
		base,
		email: owner.email,
		schoolName: owner.schoolName,
		scenes: [],
	};

	console.log('=== Login + onboarding integration ===');
	console.log(`Webapp: ${base}`);
	console.log(`Owner signup: ${owner.email}`);

	await withScene(options, 'unauthenticated-redirect', async (page) => {
		await assertPublicAuthGates(page, base);
	});
	summary.scenes.push({ id: 'unauthenticated-redirect', ok: true });

	await withScene(options, 'login-signup-ui', async (page) => {
		await runLoginSignupUi(page, base);
	});
	summary.scenes.push({ id: 'login-signup-ui', ok: true });

	await withScene(options, 'api-unavailable-banner', async (page) => {
		await runApiUnavailableBanner(page, base);
	});
	summary.scenes.push({ id: 'api-unavailable-banner', ok: true });

	await withScene(options, 'signup-cross-tab', async (page) => {
		await runSignupCrossTab(page, base);
	});
	summary.scenes.push({ id: 'signup-cross-tab', ok: true });

	await withScene(options, 'invalid-invite', async (page) => {
		await runInvalidInvite(page, base);
	});
	summary.scenes.push({ id: 'invalid-invite', ok: true });

	await withScene(options, 'invite-expired', async (page) => {
		await runInviteExpired(page, base);
	});
	summary.scenes.push({ id: 'invite-expired', ok: true });

	await withScene(options, 'wizard-step-interactions', async (page) => {
		await runWizardStepInteractions({
			page,
			browser: options.browser,
			base,
			outDir: options.outDir,
			credentials: uniqueOwner('Wizard Owner', 'Wizard School'),
		});
	});
	summary.scenes.push({ id: 'wizard-step-interactions', ok: true });

	await withScene(options, 'school-period-dates', async (page) => {
		await runSchoolPeriodDates({
			page,
			browser: options.browser,
			base,
			outDir: options.outDir,
			credentials: uniqueOwner('Period Owner', 'Period School'),
		});
	});
	summary.scenes.push({ id: 'school-period-dates', ok: true });

	await withScene(options, 'owner-wizard-resume', async (page) => {
		await runOwnerWizardResume({
			page,
			browser: options.browser,
			base,
			outDir: options.outDir,
			credentials: uniqueOwner('Resume Owner', 'Resume School'),
		});
	});
	summary.scenes.push({ id: 'owner-wizard-resume', ok: true });

	await withScene(options, 'provision-double-submit', async (page) => {
		await runProvisionDoubleSubmit({
			page,
			browser: options.browser,
			base,
			outDir: options.outDir,
			credentials: uniqueOwner('Double Submit Owner', 'Double Submit School'),
		});
	});
	summary.scenes.push({ id: 'provision-double-submit', ok: true });

	await withScene(options, 'provision-bootstrap-retry', async (page) => {
		await runProvisionBootstrapRetry({
			page,
			browser: options.browser,
			base,
			outDir: options.outDir,
			credentials: uniqueOwner('Bootstrap Retry Owner', 'Bootstrap Retry School'),
		});
	});
	summary.scenes.push({ id: 'provision-bootstrap-retry', ok: true });

	const ownerContext = await options.browser.newContext({ viewport: { width: 1440, height: 900 } });
	const ownerPage = await ownerContext.newPage();
	try {
		await runScene(options.outDir, 'happy-path', ownerPage, async () => {
			await runHappyPath({
				page: ownerPage,
				browser: options.browser,
				base,
				outDir: options.outDir,
				credentials: owner,
			});
		});
		summary.scenes.push({ id: 'happy-path', ok: true, detail: owner.email });

		const invitedStaff = await (async () => {
			let credentials = { token: '', email: '', password: '' };
			await runScene(options.outDir, 'invited-staff', ownerPage, async () => {
				credentials = await runInvitedStaff(ownerPage, options.browser, base);
			});
			return credentials;
		})();
		summary.scenes.push({ id: 'invited-staff', ok: true });

		await withScene(options, 'invited-staff-relogin', async (page) => {
			await runInvitedStaffRelogin(page, base, invitedStaff);
		});
		summary.scenes.push({ id: 'invited-staff-relogin', ok: true });

		await runScene(options.outDir, 'invited-staff-second-school', ownerPage, async () => {
			await runInvitedStaffSecondSchool(options.browser, base, options.outDir, invitedStaff);
		});
		summary.scenes.push({ id: 'invited-staff-second-school', ok: true });

		await runScene(options.outDir, 'invited-staff-existing', ownerPage, async () => {
			await runInvitedStaffExisting(ownerPage, options.browser, base);
		});
		summary.scenes.push({ id: 'invited-staff-existing', ok: true });

		await runScene(options.outDir, 'invite-wrong-account', ownerPage, async () => {
			await runInviteWrongAccount(ownerPage, base);
		});
		summary.scenes.push({ id: 'invite-wrong-account', ok: true });

		await runScene(options.outDir, 'invite-revoked', ownerPage, async () => {
			await runInviteRevoked(ownerPage, options.browser, base);
		});
		summary.scenes.push({ id: 'invite-revoked', ok: true });

		await runScene(options.outDir, 'invite-already-accepted', ownerPage, async () => {
			await runInviteAlreadyAccepted(options.browser, base, invitedStaff.token);
		});
		summary.scenes.push({ id: 'invite-already-accepted', ok: true });

		await runScene(options.outDir, 'invited-teacher', ownerPage, async () => {
			await runInvitedTeacher(ownerPage, options.browser, base);
		});
		summary.scenes.push({ id: 'invited-teacher', ok: true });

		await runScene(options.outDir, 'invited-guardian', ownerPage, async () => {
			await runInvitedGuardian(ownerPage, options.browser, base);
		});
		summary.scenes.push({ id: 'invited-guardian', ok: true });
	}
	finally {
		await ownerContext.close();
	}

	await withScene(options, 'owner-relogin', async (page) => {
		await runOwnerRelogin(page, base, owner);
	});
	summary.scenes.push({ id: 'owner-relogin', ok: true });

	summary.catalog = {
		...assertAuthOnboardingCatalogCoverage(summary.scenes.map(scene => scene.id)),
		manual: 0,
	};
	console.log(
		`Auth/Onboarding catalog: automated=${summary.catalog.automated} N/A=${summary.catalog.na} unique=${summary.catalog.unique} excluded=${summary.catalog.excluded} manual=${summary.catalog.manual}`,
	);

	return summary;
}

async function withScene(
	options: RunOnboardingSuiteOptions,
	id: string,
	run: (page: Page) => Promise<void>,
): Promise<void> {
	const context = await options.browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		await runScene(options.outDir, id, page, () => run(page));
	}
	finally {
		await context.close();
	}
}

async function runScene(
	outDir: string,
	id: string,
	page: Page | null,
	run: () => Promise<void>,
): Promise<void> {
	console.log(`→ ${id}`);
	try {
		await run();
	}
	catch (error) {
		if (page) {
			await captureFailure(page, outDir, id);
		}
		throw error;
	}
}
