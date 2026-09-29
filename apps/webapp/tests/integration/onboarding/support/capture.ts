import { redactDiagnostic } from '../../support/scenario-registry';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';

export async function captureFailure(page: Page, outDir: string, name: string): Promise<void> {
 await mkdir(outDir, { recursive: true });
 const safeName = name.replace(/[^a-z0-9._-]/gi, '-');
 await page.screenshot({ path: path.join(outDir, `${safeName}.png`), fullPage: true,
  mask: [page.locator('input, textarea, [data-sensitive]')],
 }).catch(() => undefined);
 const alerts = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
 await writeFile(path.join(outDir, `${safeName}.url.txt`), redactDiagnostic([page.url(), ...alerts].join('\n')), 'utf8');
}

export function uniqueOnboardingEmail(): string {
	const suffix = crypto.randomUUID().slice(0, 8);
	return `onboarding-${Date.now()}-${suffix}@integration.edaya.test`;
}

export function uniqueOnboardingPassword(): string {
	const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
	return `E2e!${suffix}`;
}
