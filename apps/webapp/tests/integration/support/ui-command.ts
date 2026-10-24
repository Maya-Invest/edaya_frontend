import assert from 'node:assert/strict';
import type { Page } from 'playwright';

/** Observe before clicking; both promises are handled even if the UI action fails. */
export async function uiCommand(page: Page, path: string, action: () => Promise<unknown>) {
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().includes(path) && response.request().method() === 'POST', { timeout: 60000 }),
    action(),
  ]);
  assert(response.ok(), `${path}: HTTP ${response.status()}`);
  return response;
}

/** Dialog closure and URL history settle separately; reloading between them reopens the modal. */
export async function waitForMutationDialog(page: Page): Promise<void> {
  await page.locator('[data-testid="form-modal"], [data-testid="confirm-modal"], [data-testid="picker-modal"]').waitFor({ state: 'hidden', timeout: 20000 });
  await page.waitForURL(url => !url.searchParams.has('modal'), { timeout: 20000, waitUntil: 'domcontentloaded' });
}
