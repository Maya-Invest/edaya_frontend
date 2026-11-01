import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page, Response, Request } from 'playwright';
import { redactDiagnostic } from './scenario-registry';

interface Capture {
  id: string;
  expected: string;
  directory: string;
  page: Page;
  captured?: string;
  http: string[];
  cleanup: Array<() => void>;
}
const active = new AsyncLocalStorage<Capture>();
export function observeScenarioPage(page: Page): void {
  const capture = active.getStore();
  if (!capture) return;
  capture.page = page;
  const response = (response: Response) => {
    if (response.status() >= 400) capture.http.push(redactDiagnostic(`${response.request().method()} ${new URL(response.url()).pathname} HTTP ${response.status()}`));
  };
  const failed = (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/core/') || path.startsWith('/auth/')) capture.http.push(redactDiagnostic(`${request.method()} ${path}: ${request.failure()?.errorText}`));
  };
  page.on('response', response);
  page.on('requestfailed', failed);
  capture.cleanup.push(() => { page.off('response', response); page.off('requestfailed', failed); });
}
/** Preserve an isolated session's actual page before its context is disposed. */
export async function captureScenarioPage(page: Page): Promise<void> {
  const capture = active.getStore();
  if (!capture || page.isClosed()) return;
  await mkdir(capture.directory, { recursive: true });
  const file = `${capture.id}.png`;
  await page.screenshot({ path: join(capture.directory, file), fullPage: true,
    mask: [page.locator('input, textarea, pre, code, [data-testid*="secret"], [data-testid*="recovery"], [data-testid*="otp"], canvas, svg[aria-label*="QR"]')] });
  capture.captured = file;
}

export async function withArtifactScope<T>(
  input: { id: string; expected: string; directory: string; page: Page }, run: () => Promise<T>,
): Promise<T> {
  return active.run({ ...input, http: [], cleanup: [] }, async () => {
    const capture = active.getStore()!;
    observeScenarioPage(input.page);
    try { return await run(); }
    catch (error) {
      await captureScenarioPage(capture.page);
      await writeFile(join(capture.directory, `${capture.id}.json`), JSON.stringify({
        scenarioId: capture.id, expected: capture.expected, detail: redactDiagnostic(String(error)),
        screenshot: capture.captured, http: capture.http.slice(-30),
      }, null, 2));
      throw error;
    }
    finally { for (const cleanup of capture.cleanup) cleanup(); }
  });
}
export async function withScenarioArtifacts<T extends { statut: string; detail?: string }>(
  input: { id: string; expected: string; directory: string; page: Page }, run: () => Promise<T>,
): Promise<T> {
  return active.run({ ...input, http: [], cleanup: [] }, async () => {
    const capture = active.getStore()!;
    observeScenarioPage(input.page);
    try {
      const result = await run();
      if (result.statut !== 'OK') {
        await captureScenarioPage(capture.page).catch(() => {});
        await mkdir(capture.directory, { recursive: true });
        await writeFile(join(capture.directory, `${capture.id}.json`), JSON.stringify({
          scenarioId: capture.id, expected: capture.expected, detail: redactDiagnostic(result.detail ?? ''),
          screenshot: capture.captured, http: capture.http.slice(-30),
        }, null, 2));
      }
      return result;
    }
    catch (error) {
      await captureScenarioPage(capture.page);
      await mkdir(capture.directory, { recursive: true });
      await writeFile(join(capture.directory, `${capture.id}.json`), JSON.stringify({
        scenarioId: capture.id, expected: capture.expected, detail: redactDiagnostic(String(error)),
        screenshot: capture.captured, http: capture.http.slice(-30),
      }, null, 2));
      throw error;
    }
    finally { for (const cleanup of capture.cleanup) cleanup(); }
  });
}
