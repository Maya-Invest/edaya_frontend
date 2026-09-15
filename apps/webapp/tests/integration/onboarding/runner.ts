import type { Browser } from 'playwright';
import { captureFailure, uniqueOnboardingEmail, uniqueOnboardingPassword } from './support/capture';
import { assertStackReady } from './support/auth';
import { ONBOARDING_WEBAPP_BASE } from './support/paths';
import { assertUnauthenticatedOnboardingRedirect } from './scenes/gates';
import { runHappyPath } from './scenes/happy-path';
import type { OnboardingSuiteSummary } from './types';

export interface RunOnboardingSuiteOptions {
	browser: Browser;
	base?: string;
	outDir: string;
}

export async function runOnboardingSuite(
	options: RunOnboardingSuiteOptions,
): Promise<OnboardingSuiteSummary> {
	const base = options.base ?? ONBOARDING_WEBAPP_BASE;
	await assertStackReady(base);

	const credentials = {
		email: uniqueOnboardingEmail(),
		password: uniqueOnboardingPassword(),
		name: 'Onboarding Owner',
		schoolName: `Onboarding School ${Date.now()}`,
		city: 'Abidjan',
	};

	const summary: OnboardingSuiteSummary = {
		generatedAt: new Date().toISOString(),
		ok: true,
		base,
		email: credentials.email,
		schoolName: credentials.schoolName,
		scenes: [],
	};

	console.log('=== Onboarding integration ===');
	console.log(`Webapp: ${base}`);
	console.log(`Signup: ${credentials.email}`);

	const unauthContext = await options.browser.newContext({ viewport: { width: 1440, height: 900 } });
	const unauthPage = await unauthContext.newPage();
	try {
		await runScene(options.outDir, 'unauthenticated-redirect', unauthPage, async () => {
			await assertUnauthenticatedOnboardingRedirect(unauthPage, base);
		});
		summary.scenes.push({ id: 'unauthenticated-redirect', ok: true });
	}
	finally {
		await unauthContext.close();
	}

	const context = await options.browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		await runScene(options.outDir, 'happy-path', page, async () => {
			await runHappyPath({
				page,
				browser: options.browser,
				base,
				outDir: options.outDir,
				credentials,
			});
		});
		summary.scenes.push({ id: 'happy-path', ok: true, detail: credentials.email });
	}
	finally {
		await context.close();
	}

	return summary;
}

async function runScene(
	outDir: string,
	id: string,
	page: import('playwright').Page | null,
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
