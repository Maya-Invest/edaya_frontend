import type { Browser, BrowserContext, Page } from 'playwright';
import type { ScenarioContext, ScenarioDefinition, RunScenarioOptions, VisualCheckpoint } from './scenario-registry';
import { observeScenarioPage, captureScenarioPage, withArtifactScope } from './scenario-artifacts';
import { captureFailure } from '../onboarding/support/capture';
import { resolveApiUrl, resolveAuthUrl } from './integration-hosts';

export interface BrowserScenarioContext extends ScenarioContext {
  browser: Browser;
  page: Page;
  base: string;
  apiUrl: string;
  authUrl: string;
  locale: 'fr' | 'en';
  viewport: { width: number; height: number };
  outDir: string;
  newSession: () => Promise<{ context: BrowserContext; page: Page }>;
}

export interface BrowserScenarioOptions {
  browser: Browser;
  base: string;
  outDir: string;
  apiUrl?: string;
  authUrl?: string;
  locale?: 'fr' | 'en';
  viewport?: { width: number; height: number };
  fixtures?: Record<string, unknown>;
  sessionStorage?: Record<string, string>;
  storageState?: NonNullable<Parameters<Browser['newContext']>[0]>['storageState'];
}

/** All registered contexts close after diagnostics, including setup failures. */
export async function createBrowserScenarioContext(
  options: BrowserScenarioOptions, registerCleanup: ScenarioContext['registerCleanup'],
): Promise<BrowserScenarioContext> {
  const locale = options.locale ?? 'fr';
  const viewport = options.viewport ?? { width: 1440, height: 900 };
  const newSession = async () => {
    const context = await options.browser.newContext({ viewport, locale: locale === 'fr' ? 'fr-FR' : 'en-US',
      colorScheme: 'light', reducedMotion: 'reduce', deviceScaleFactor: 1, storageState: options.storageState });
    registerCleanup(() => context.close());
    await context.addInitScript(({ lang, values }) => {
      localStorage.setItem('lang', lang);
      for (const [key, value] of Object.entries(values)) sessionStorage.setItem(key, value);
    }, { lang: locale, values: options.sessionStorage ?? {} });
    context.on('page', observeScenarioPage);
    const page = await context.newPage();
    return { context, page };
  };
  const { page } = await newSession();
  return { ...options, fixtures: options.fixtures ?? {}, registerCleanup, locale, viewport, page,
    apiUrl: resolveApiUrl(options.apiUrl), authUrl: resolveAuthUrl(options.authUrl), newSession };
}

/** Adapt legacy suites without changing their action assertions or report formats. */
export function browserScenarioLifecycle(options: BrowserScenarioOptions,
  execute: (scenario: ScenarioDefinition<BrowserScenarioContext>, context: BrowserScenarioContext) => Promise<void>,
): RunScenarioOptions<BrowserScenarioContext> {
  return {
    createContext: (_scenario, cleanup) => createBrowserScenarioContext(options, cleanup),
    execute: (scenario, context) => withArtifactScope({ id: scenario.id, expected: scenario.feature,
      directory: options.outDir, page: context.page }, () => execute(scenario, context)),
    onFailure: async (_error, context, scenario) => {
      if (!context.page.isClosed()) await captureFailure(context.page, context.outDir, `${scenario.id}-failure`);
    },
  };
}

export async function withObservedPage<T>(context: BrowserContext, run: (page: Page) => Promise<T>): Promise<T> {
  const page = await context.newPage();
  observeScenarioPage(page);
  try { return await run(page); }
  catch (error) { await captureScenarioPage(page); throw error; }
  finally { await page.close(); }
}

export type BrowserCheckpoint = VisualCheckpoint<BrowserScenarioContext>;

/** Bind a journey-owned session; only sessions opened by this context are disposed per scenario. */
export function bindBrowserScenarioContext(options: BrowserScenarioOptions, page: Page,
  registerCleanup: ScenarioContext['registerCleanup'],
): BrowserScenarioContext {
  const locale = options.locale ?? 'fr';
  const viewport = options.viewport ?? page.viewportSize() ?? { width: 1440, height: 900 };
  return { browser: options.browser, base: options.base, page, outDir: options.outDir,
    locale, viewport,
    fixtures: options.fixtures ?? {}, registerCleanup,
    apiUrl: resolveApiUrl(options.apiUrl), authUrl: resolveAuthUrl(options.authUrl),
    newSession: async () => {
      const context = await options.browser.newContext({ viewport, locale: locale === 'fr' ? 'fr-FR' : 'en-US', colorScheme: 'light', reducedMotion: 'reduce' });
      registerCleanup(() => context.close());
      await context.addInitScript(lang => localStorage.setItem('lang', lang), locale);
      context.on('page', observeScenarioPage);
      return { context, page: await context.newPage() };
    },
  };
}
