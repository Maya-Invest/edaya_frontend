import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';

export async function captureFailure(page: Page, outDir: string, name: string): Promise<void> {
	await mkdir(outDir, { recursive: true });
	const shotPath = path.join(outDir, `${name}.png`);
	const urlPath = path.join(outDir, `${name}.url.txt`);
	await page.screenshot({ path: shotPath, fullPage: true }).catch(() => undefined);
	const alertText = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
	const debug = await page.evaluate(() => {
		const shell = document.querySelector('[data-onboarding-step]');
		const draftKeys = (store: Storage) =>
			Object.fromEntries(Object.entries(store).filter(([key]) => key.includes('onboarding')));
		return {
			domStep: shell?.getAttribute('data-onboarding-step'),
			domMaxStep: shell?.getAttribute('data-onboarding-max-step'),
			sessionDrafts: draftKeys(sessionStorage),
			localDrafts: draftKeys(localStorage),
		};
	}).catch(() => null);
	await writeFile(urlPath, [
		page.url(),
		debug ? `domStep=${debug.domStep} domMaxStep=${debug.domMaxStep}` : '',
		debug ? `sessionDrafts=${JSON.stringify(debug.sessionDrafts)}` : '',
		debug ? `localDrafts=${JSON.stringify(debug.localDrafts)}` : '',
		alertText.length > 0 ? `alerts:\n${alertText.join('\n')}` : '',
	].filter(Boolean).join('\n'), 'utf8');
}

export function uniqueOnboardingEmail(): string {
	const suffix = crypto.randomUUID().slice(0, 8);
	return `onboarding-${Date.now()}-${suffix}@integration.edaya.test`;
}

export function uniqueOnboardingPassword(): string {
	const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
	return `E2e!${suffix}`;
}
