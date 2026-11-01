import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Page } from 'playwright';
import type { BrowserScenarioContext } from './browser-scenario';
import type { ScenarioDefinition, ScenarioResult, VisualCheckpoint } from './scenario-registry';
import { redactDiagnostic } from './scenario-registry';

export interface VisualCapture {
  scenarioId: string;
  checkpointId: string;
  title: string;
  module: string;
  surface: string;
  device: string;
  locale: string;
  viewport: { width: number; height: number };
  status: 'passed' | 'failed' | 'blocked';
  file?: string;
  url?: string;
  capturedAt?: string;
  sha256?: string;
  detail?: string;
  fixtureIdentity?: string;
}
export interface VisualManifest {
  generatedAt: string;
  profile: 'screenshots' | 'integration';
  sourceRevision: string;
  sourceDigest: string;
  sourceState: 'working-tree';
  browser: string;
  theme: 'light';
  captures: VisualCapture[];
  results: ScenarioResult[];
  exclusions: Array<{ surface: string; reason: string }>;
  error?: string;
}

export function safeArtifactName(value: string): string {
  // Keep distinct URL punctuation from collapsing into the same filename.
  return `${value.replace(/[^a-zA-Z0-9._-]/g, '-')}-${createHash('sha256').update(value).digest('hex').slice(0, 8)}`;
}

export async function settleVisualPage(page: Page): Promise<void> {
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"], [role="status"] .animate-spin'));
  await page.waitForFunction(() => document.fonts.status === 'loaded'
    && Array.from(document.images).filter(image => {
      const rect = image.getBoundingClientRect();
      return image.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    }).every(image => image.complete && image.naturalWidth > 0));
  await page.evaluate(async () => {
    await Promise.race([Promise.all(Array.from(document.images).filter(image => {
      const rect = image.getBoundingClientRect();
      return image.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    }).map(async image => {
      const src = image.src;
      try { await image.decode(); }
      catch (error) {
        // An asynchronous photo component can replace/revoke its placeholder.
        if (image.isConnected && image.src === src && image.getBoundingClientRect().width > 0) throw error;
      }
    })), new Promise<void>((_resolve, reject) => setTimeout(() => reject(new Error('Visible images did not finish decoding')), 20000))]);
  });
  // Fonts and images can move overlays. Require stable geometry across animation frames.
  await page.waitForFunction(() => {
    const state = window as typeof window & { __captureLayout?: { value: string; frames: number } };
    const value = Array.from(document.querySelectorAll('main, aside, [role="dialog"], h1, h2')).map(element => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].map(Math.round).join(',');
    }).join('|');
    state.__captureLayout = { value, frames: state.__captureLayout?.value === value ? state.__captureLayout.frames + 1 : 0 };
    return state.__captureLayout.frames >= 3;
  }, undefined, { polling: 'raf' });
}

export async function captureVisualCheckpoint(
  checkpoint: VisualCheckpoint<BrowserScenarioContext>, context: BrowserScenarioContext,
  scenario: ScenarioDefinition<BrowserScenarioContext>, device: string, directory: string, ordinal = 0,
): Promise<VisualCapture> {
  await settleVisualPage(context.page);
  const expectedPath = checkpoint.surface.split('?')[0]!.replace(/\[[^\]]+\]/g, '__RECORD__');
  const pathPattern = new RegExp(`^${expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('__RECORD__', '[^/]+')}/?$`);
  if (!pathPattern.test(decodeURIComponent(new URL(context.page.url()).pathname))) throw new Error('Checkpoint redirected or its drawer closed before capture');
  if (await context.page.locator('html').getAttribute('lang') !== context.locale) throw new Error('Capture language did not match requested locale');
  const file = `images/${safeArtifactName(`${scenario.id}/${checkpoint.id}/${device}/${context.locale}/${context.viewport.width}x${context.viewport.height}/${ordinal}`)}.png`;
  await mkdir(join(directory, 'images'), { recursive: true });
  const buffer = await context.page.screenshot({ path: join(directory, file), fullPage: false,
    animations: 'disabled', caret: 'hide', mask: [context.page.locator(
      'input[type="password"], [data-sensitive], [data-testid*="secret"], [data-testid*="recovery"], [data-testid="auth-code"], [data-testid="auth-test-code"], svg[aria-label*="QR"]',
    )] });
  return { scenarioId: scenario.id, checkpointId: checkpoint.id, title: checkpoint.title, surface: checkpoint.surface,
    module: scenario.feature.split('.')[0]!, device, locale: context.locale, viewport: context.viewport, status: 'passed',
    file, url: redactDiagnostic(context.page.url()), capturedAt: new Date().toISOString(),
    sha256: createHash('sha256').update(buffer).digest('hex'), fixtureIdentity: String(context.fixtures.identity ?? 'anonymous') };
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

/** No network dependencies; safe to open directly as a local HTML file. */
export function renderVisualGallery(manifest: VisualManifest): string {
  const options = (values: string[]) => [...new Set(values)].sort().map(value => `<option>${escapeHtml(value)}</option>`).join('');
  const groups = new Map<string, VisualCapture[]>();
  for (const capture of manifest.captures) {
    const key = `${capture.scenarioId}/${capture.checkpointId}`;
    groups.set(key, [...(groups.get(key) ?? []), capture]);
  }
  const groupsHtml = [...groups].map(([key, captures]) => `<section data-search="${escapeHtml(`${key} ${captures[0]!.title} ${captures[0]!.surface}`.toLowerCase())}">
    <h2>${escapeHtml(captures[0]!.title)}</h2><p class="path">${escapeHtml(captures[0]!.surface)}</p><div class="comparison">${captures.map(capture => `
      <figure data-module="${escapeHtml(capture.module)}" data-device="${escapeHtml(capture.device)}" data-locale="${escapeHtml(capture.locale)}" data-status="${capture.status}">
        <figcaption><strong>${escapeHtml(capture.device)} · ${escapeHtml(capture.locale.toUpperCase())}</strong>
        <span>${capture.viewport.width} × ${capture.viewport.height} · ${capture.status}</span></figcaption>
        ${capture.file ? `<a href="${escapeHtml(capture.file)}"><img loading="lazy" src="${escapeHtml(capture.file)}" alt="${escapeHtml(capture.title)}"></a>` : ''}
        ${capture.detail ? `<p class="failure">${escapeHtml(capture.detail)}</p>` : ''}</figure>`).join('')}</div></section>`).join('');
  const failures = manifest.captures.filter(capture => capture.status !== 'passed').length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>EDAYA screenshot gallery</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f0f7ff;color:#1e293b;font:15px/1.5 system-ui}header,main{padding:24px;max-width:1800px;margin:auto}
    header{position:sticky;top:0;background:#f0f7fff5;z-index:1;border-bottom:1px solid #cbd5e1}h1{margin:0;font-size:26px}h2{font-size:19px;margin-bottom:4px}
    .filters{display:flex;gap:10px;flex-wrap:wrap}input,select{font:inherit;padding:9px;border:1px solid #64748b;border-radius:8px;background:white}input{flex:1;min-width:200px}
    .comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}figure{margin:0;border:1px solid #cbd5e1;background:white;border-radius:12px;overflow:hidden}
    figcaption{padding:12px;display:flex;flex-direction:column}figcaption span,.path{color:#5b6b82}img{width:100%;height:480px;object-fit:contain;object-position:top;background:#edf2f7}
    section{margin-bottom:32px}.failure{color:#991b1b;padding:12px;overflow-wrap:anywhere}a{color:#2563eb}[hidden]{display:none!important}
    </style></head><body><header><h1>EDAYA · Screenshot gallery</h1><p>${manifest.captures.length} captures · ${failures} failed or blocked · <a href="manifest.json">Capture details</a></p>
    ${manifest.error ? `<p class="failure">${escapeHtml(manifest.error)}</p>` : ''}
    <div class="filters"><input id="search" aria-label="Search views" placeholder="Search views"><select id="module" aria-label="Module"><option value="">All modules</option>${options(manifest.captures.map(c => c.module))}</select>
    <select id="locale" aria-label="Language"><option value="">All languages</option>${options(manifest.captures.map(c => c.locale))}</select>
    <select id="device" aria-label="Device"><option value="">Compare all devices</option>${options(manifest.captures.map(c => c.device))}</select>
    <select id="status" aria-label="Status"><option value="">All results</option><option>passed</option><option>failed</option><option>blocked</option></select></div></header><main>${groupsHtml || '<p>No captures completed. See the run error above.</p>'}
    <p>Source ${escapeHtml(manifest.sourceRevision.slice(0, 12))} · ${escapeHtml(manifest.generatedAt)} · ${escapeHtml(manifest.browser)}</p></main>
    <script>function filter(){const query=document.querySelector('#search').value.toLowerCase();for(const section of document.querySelectorAll('section')){for(const card of section.querySelectorAll('figure')){card.hidden=!section.dataset.search.includes(query)||['module','locale','device','status'].some(key=>{const value=document.querySelector('#'+key).value;return value&&card.dataset[key]!==value})}section.hidden=[...section.querySelectorAll('figure')].every(card=>card.hidden)}}for(const control of document.querySelectorAll('input,select'))control.addEventListener('input',filter)</script></body></html>`;
}

export async function writeVisualGallery(directory: string, manifest: VisualManifest): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await writeFile(join(directory, 'index.html'), renderVisualGallery(manifest));
}

export function sourceRevision(repository: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
}

/** Explicit CLI configuration; no scenario identity is passed through environment state. */
export function integrationCaptureEnabled(): boolean {
  return process.argv.includes('--capture-checkpoints') || process.env.SCENARIO_CAPTURE_CHECKPOINTS === 'true';
}
const integrationManifests = new Map<string, VisualManifest>();
export async function captureIntegrationCheckpoint(
  checkpoint: VisualCheckpoint<BrowserScenarioContext>, context: BrowserScenarioContext,
  scenario: ScenarioDefinition<BrowserScenarioContext>,
): Promise<void> {
  if (!integrationCaptureEnabled()) return;
  const directory = join(context.outDir, 'checkpoints');
  let manifest = integrationManifests.get(directory);
  if (!manifest) {
    const { sourceFingerprint } = await import('./execution-metadata');
    const repository = join(import.meta.dirname, '../../../../..');
    manifest = { generatedAt: new Date().toISOString(), profile: 'integration', sourceRevision: sourceRevision(repository),
      sourceDigest: sourceFingerprint(), sourceState: 'working-tree', browser: `Chromium ${context.browser.version()}`,
      theme: 'light', captures: [], results: [], exclusions: [] };
    integrationManifests.set(directory, manifest);
  }
  const lang = await context.page.locator('html').getAttribute('lang');
  if (lang !== 'fr' && lang !== 'en') throw new Error('Integration checkpoint has no supported language');
  manifest.captures.push(await captureVisualCheckpoint(checkpoint, { ...context, locale: lang,
    viewport: context.page.viewportSize() ?? context.viewport }, scenario, 'integration', directory, manifest.captures.length));
  await writeVisualGallery(directory, manifest);
}
