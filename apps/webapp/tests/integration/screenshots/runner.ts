import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Browser } from 'playwright';
import { ensurePlaywrightChromium } from '../../../scripts/playwright-browsers';
import { createBrowserScenarioContext, type BrowserScenarioContext } from '../support/browser-scenario';
import { runScenarios, validateScenarios, redactDiagnostic, type ScenarioDefinition } from '../support/scenario-registry';
import { captureVisualCheckpoint, writeVisualGallery, sourceRevision, safeArtifactName, type VisualManifest } from '../support/visual-artifacts';
import { beginExecution, sourceFingerprint } from '../support/execution-metadata';
import { attemptPasswordSignIn } from '../demo-dry-run/support/auth';
import { resolveApiUrl, resolveAuthUrl } from '../support/integration-hosts';
import { OWNER_EMAIL } from '../demo-dry-run/support/constants';
import { VISUAL_SCENARIOS, VISUAL_EXCLUSIONS, scenarioIdentity } from './scenarios';
import { resolveScreenshotFixtures, resolveScreenshotAcademicScope, assertLocalEndpoint } from './fixtures';
import { DEVICES, type ScreenshotOptions } from './options';
import { captureFailure } from '../onboarding/support/capture';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';

const webapp = resolve(import.meta.dirname, '../../..');
const repository = resolve(webapp, '../..');

export function selectedCheckpoints(options: ScreenshotOptions) {
  return VISUAL_SCENARIOS.flatMap(scenario => (scenario.steps ?? []).flatMap(step => {
    const checkpoint = step.checkpoint;
    if (!checkpoint || (options.module && options.module !== scenario.feature.split('.')[0])
      || (options.scenario && !scenario.id.startsWith(options.scenario))
      || (options.checkpoint && checkpoint.id !== options.checkpoint)) return [];
    return [{ scenario, checkpoint }];
  }));
}

async function assertServices(base: string, apiUrl: string, authUrl: string) {
  for (const url of [base, apiUrl, authUrl]) assertLocalEndpoint(url);
  for (const url of [`${base}/login`, `${apiUrl}/reference`, `${authUrl}/auth/edaya/methods`]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Service not ready: ${url} (HTTP ${response.status})`);
  }
}

export async function runScreenshotGallery(options: ScreenshotOptions): Promise<{ directory: string; ok: boolean }> {
  validateScenarios(VISUAL_SCENARIOS);
  const selection = selectedCheckpoints(options);
  if (!selection.length) throw new Error('No checkpoints match the requested filters; use --list');
  if (options.list) {
    for (const { scenario, checkpoint } of selection) console.log(`${scenario.id} / ${checkpoint.id}\t${checkpoint.surface}`);
    return { directory: '', ok: true };
  }
  const directory = resolve(options.out ?? join(webapp, '.screenshots', `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`));
  // An explicit output directory is a new run; never overwrite evidence from an earlier run.
  await mkdir(resolve(directory, '..'), { recursive: true });
  await mkdir(directory, { recursive: false });
  const base = (process.env.WEBAPP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  const apiUrl = resolveApiUrl();
  const authUrl = resolveAuthUrl();
  const manifest: VisualManifest = { generatedAt: new Date().toISOString(), profile: 'screenshots',
    sourceRevision: sourceRevision(repository), sourceDigest: sourceFingerprint(), sourceState: 'working-tree',
    browser: 'Chromium', theme: 'light', captures: [], results: [], exclusions: VISUAL_EXCLUSIONS };
  let browser: Browser | undefined;
  let finalize: (() => void) | undefined;
  try {
    finalize = beginExecution(directory);
    await assertServices(base, apiUrl, authUrl);
    ensurePlaywrightChromium();
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: !options.headed });
    manifest.browser = `Chromium ${browser.version()}`;
    const cleanups: Array<() => void | Promise<void>> = [];
    let ownerState: Awaited<ReturnType<import('playwright').BrowserContext['storageState']>>;
    let fixtureEntities;
    let academicScope: { yearId: string; periodId: string };
    let ownerSession: Record<string, string>;
    try {
      const context = await createBrowserScenarioContext({ browser, base, apiUrl, authUrl, outDir: directory }, cleanup => cleanups.push(cleanup));
      if (!await attemptPasswordSignIn(context.page, base, OWNER_EMAIL, '')) throw new Error('Demo owner OTP sign-in failed; enable PUBLIC_TEST_OTP_ACCESS=true and captured OTP on the local test API.');
      await context.page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
      await context.page.getByTestId('academic-year-trigger').waitFor();
      fixtureEntities = await resolveScreenshotFixtures(context.page, base, apiUrl);
      academicScope = await resolveScreenshotAcademicScope(context.page, base, apiUrl);
      ownerState = await context.page.context().storageState();
      ownerSession = await context.page.evaluate(() => Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)!])));
    } finally { for (const cleanup of cleanups.reverse()) await cleanup(); }

    for (const device of options.devices) for (const locale of options.locales) {
      for (const { scenario, checkpoint } of selection) {
        const label = `${scenario.id}/${checkpoint.id}/${device}/${locale}`;
        console.log(`→ ${label}`);
        const results = await runScenarios<BrowserScenarioContext>(VISUAL_SCENARIOS, {
          profile: 'screenshots', select: [scenario.id], targets: { [scenario.id]: checkpoint.id },
          createContext: async (definition, cleanup) => {
            const identity = scenarioIdentity(definition);
            const context = await createBrowserScenarioContext({ browser: browser!, base, apiUrl, authUrl, outDir: directory,
              locale, viewport: DEVICES[device], storageState: identity === 'owner' ? ownerState : undefined,
              sessionStorage: identity === 'owner' ? ownerSession : undefined,
              fixtures: { identity: identity === 'owner' ? 'demo-ci owner' : 'disposable or anonymous', entities: structuredClone(fixtureEntities), academicScope },
            }, cleanup);
            context.page.setDefaultTimeout(20000);
            await context.page.context().addInitScript(({ school, year, period }) => {
              sessionStorage.setItem(`edaya:yearId:${school}`, year);
              sessionStorage.setItem(`edaya:periodId:${school}`, period);
            }, { school: SEED_SCHOOL_ID, year: academicScope.yearId, period: academicScope.periodId });
            return context;
          },
          onCheckpoint: async (point, context, definition) => {
            manifest.captures.push(await captureVisualCheckpoint(point, context, definition, device, directory));
          },
          onFailure: async (error, context, definition) => {
            const name = safeArtifactName(`${label}/${definition.id}`);
            await captureFailure(context.page, join(directory, 'diagnostics'), name);
            console.error(`✗ ${label}: ${redactDiagnostic(String(error))}`);
          },
        });
        manifest.results.push(...results.map(result => ({ ...result, id: `${result.id}/${checkpoint.id}/${device}/${locale}` })));
        const outcome = results.find(result => result.id === scenario.id)!;
        const captured = manifest.captures.find(capture => capture.scenarioId === scenario.id && capture.checkpointId === checkpoint.id && capture.device === device && capture.locale === locale);
        if (captured && outcome.status !== 'passed') { captured.status = outcome.status; captured.detail = outcome.detail; }
        if (!manifest.captures.some(capture => capture.scenarioId === scenario.id && capture.checkpointId === checkpoint.id && capture.device === device && capture.locale === locale)) {
          manifest.captures.push({ scenarioId: scenario.id, checkpointId: checkpoint.id, title: checkpoint.title,
            module: scenario.feature.split('.')[0]!, surface: checkpoint.surface, device, locale, viewport: DEVICES[device],
            status: outcome.status === 'blocked' ? 'blocked' : 'failed', detail: outcome.detail ?? 'Checkpoint was not captured' });
        }
        // Keep a usable partial gallery even if a long capture process is interrupted.
        await writeVisualGallery(directory, manifest);
      }
    }
    if (manifest.captures.some(capture => capture.status !== 'passed') || manifest.results.some(result => result.status !== 'passed')) {
      manifest.error = 'Some required checkpoints failed. Review the failed captures and diagnostics.';
    } else finalize();
  } catch (error) {
    manifest.error = redactDiagnostic(String(error));
    console.error(`Screenshot run failed: ${manifest.error}`);
    console.error('Start the local test API with captured OTP, seed demo-ci, and start the development webapp with PUBLIC_TEST_OTP_ACCESS=true.');
  } finally {
    try { await browser?.close(); }
    finally { await writeVisualGallery(directory, manifest); }
  }
  console.log(`Gallery: ${join(directory, 'index.html')}`);
  return { directory, ok: !manifest.error && manifest.captures.length === selection.length * options.devices.length * options.locales.length };
}
