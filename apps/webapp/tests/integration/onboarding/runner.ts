import type { Browser, Page } from 'playwright';
import { captureFailure, uniqueOnboardingEmail, uniqueOnboardingPassword } from './support/capture';
import { assertStackReady } from './support/auth';
import { ONBOARDING_WEBAPP_BASE } from './support/paths';
import { assertPublicAuthGates } from './scenes/gates';
import { runHappyPath } from './scenes/happy-path';
import { runInvalidInvite } from './scenes/invalid-invite';
import { runInvitedStaff } from './scenes/invited-staff';
import { runLoginSignupUi } from './scenes/login-signup-ui';
import { runOwnerRelogin } from './scenes/owner-relogin';
import { runOwnerWizardResume } from './scenes/owner-resume';
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

	await withScene(options, 'invalid-invite', async (page) => {
		await runInvalidInvite(page, base);
	});
	summary.scenes.push({ id: 'invalid-invite', ok: true });

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

		await runScene(options.outDir, 'invited-staff', ownerPage, async () => {
			await runInvitedStaff(ownerPage, options.browser, base);
		});
		summary.scenes.push({ id: 'invited-staff', ok: true });
	}
	finally {
		await ownerContext.close();
	}

	await withScene(options, 'owner-relogin', async (page) => {
		await runOwnerRelogin(page, base, owner);
	});
	summary.scenes.push({ id: 'owner-relogin', ok: true });

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
