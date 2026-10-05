import { describe, expect, test } from 'bun:test';
import { runScenarios, selectScenarios, validateScenarios, assertCompleteResults, type ScenarioDefinition } from '../integration/support/scenario-registry';
import { parseScreenshotOptions } from '../integration/screenshots/options';
import { renderVisualGallery, safeArtifactName, type VisualManifest } from '../integration/support/visual-artifacts';
import { withArtifactScope, observeScenarioPage, captureScenarioPage } from '../integration/support/scenario-artifacts';
import type { Page } from 'playwright';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const definitions = (calls: string[]): ScenarioDefinition[] => [{ id: 'student.edit', feature: 'school.students', steps: [
  { id: 'open', run: async () => { calls.push('open'); }, checkpoint: { id: 'form', title: 'Edit form', surface: '/school/students?modal=edit', ready: async () => { calls.push('ready'); } } },
  { id: 'save', run: async () => { calls.push('save'); } },
  { id: 'verify', run: async () => { calls.push('verify-persistence'); } },
] }];

describe('shared scenario runner', () => {
  test('filtered selection includes dependencies and orders a graph independently of declaration order', () => {
    const scenarios = [{ id: 'child', feature: 'f', dependsOn: ['setup'] }, { id: 'other', feature: 'f' }, { id: 'setup', feature: 'f' }];
    expect(selectScenarios(scenarios, ['child']).map(scenario => scenario.id)).toEqual(['setup', 'child']);
    expect(() => selectScenarios(scenarios, ['removed'])).toThrow('Unknown');
    expect(() => selectScenarios(scenarios, [])).toThrow('No scenarios');
  });
  test('cycles and invalid checkpoint registrations fail before execution', () => {
    expect(() => validateScenarios([{ id: 'a', feature: 'f', dependsOn: ['b'] }, { id: 'b', feature: 'f', dependsOn: ['a'] }])).toThrow('cycle');
    const steps = definitions([])[0]!.steps!;
    expect(() => validateScenarios([{ id: 'a', feature: 'f', steps: [...steps, steps[0]!] }])).toThrow('duplicate');
  });
  test('stopping at a screenshot checkpoint never executes or credits save assertions', async () => {
    const calls: string[] = [];
    const scenarios = definitions(calls);
    const results = await runScenarios(scenarios, { profile: 'screenshots', targets: { 'student.edit': 'form' }, onCheckpoint: async () => { calls.push('capture'); } });
    expect(calls).toEqual(['open', 'ready', 'capture']);
    expect(results[0]?.completion).toBe('checkpoint');
    expect(() => assertCompleteResults(scenarios, results)).toThrow('not integration completion');
  });
  test('integration executes all assertions and can collect the same checkpoint', async () => {
    const calls: string[] = [];
    const scenarios = definitions(calls);
    const results = await runScenarios(scenarios, { onCheckpoint: async () => { calls.push('capture'); } });
    expect(calls).toEqual(['open', 'ready', 'capture', 'save', 'verify-persistence']);
    expect(() => assertCompleteResults(scenarios, results)).not.toThrow();
  });
  test('capture failure fails the scenario and diagnostics precede reverse-order cleanup', async () => {
    const calls: string[] = [];
    const results = await runScenarios(definitions(calls), {
      profile: 'screenshots', targets: { 'student.edit': 'form' },
      createContext: async (_scenario, registerCleanup) => {
        registerCleanup(() => { calls.push('close-browser'); });
        registerCleanup(() => { calls.push('remove-handler'); });
        return { fixtures: {}, registerCleanup };
      },
      onCheckpoint: async () => { throw new Error('Disk full'); },
      onFailure: async () => { calls.push('diagnostic'); },
    });
    expect(results[0]?.status).toBe('failed');
    expect(calls).toEqual(['open', 'ready', 'diagnostic', 'remove-handler', 'close-browser']);
  });
  test('setup failures and missing fixtures clean up allocated sessions and block dependent work', async () => {
    const calls: string[] = [];
    const results = await runScenarios([{ id: 'setup', feature: 'f', fixtureRequirements: ['student'] },
      { id: 'child', feature: 'f', dependsOn: ['setup'] }, { id: 'independent', feature: 'f' }], {
      createContext: async (scenario, registerCleanup) => {
        registerCleanup(() => { calls.push(`cleanup:${scenario.id}`); });
        return { fixtures: {}, registerCleanup };
      }, execute: async scenario => { calls.push(scenario.id); },
    });
    expect(results.map(result => result.status)).toEqual(['failed', 'blocked', 'passed']);
    expect(calls).toEqual(['cleanup:setup', 'independent', 'cleanup:independent']);
    const allocated: string[] = [];
    const failedSetup = await runScenarios([{ id: 'broken', feature: 'f' }], {
      createContext: async (_scenario, cleanup) => { cleanup(() => { allocated.push('closed'); }); throw new Error('Setup failed'); },
    });
    expect(allocated).toEqual(['closed']);
    expect(failedSetup[0]?.status).toBe('failed');
  });
  test('unknown screenshot checkpoints and missing collectors are rejected', async () => {
    await expect(runScenarios(definitions([]), { profile: 'screenshots', targets: { 'student.edit': 'unknown' }, onCheckpoint: async () => {} })).rejects.toThrow('Unknown');
    await expect(runScenarios(definitions([]), { profile: 'screenshots' })).rejects.toThrow('collector');
    await expect(runScenarios(definitions([]), { targets: { 'student.edit': 'form' } })).rejects.toThrow('requires screenshot');
  });
  test('falsy thrown errors and cleanup errors cannot become successful results', async () => {
    const scenarios = [{ id: 'cleanup', feature: 'f' }, { id: 'falsy', feature: 'f' }];
    const results = await runScenarios(scenarios, {
      createContext: async (scenario, registerCleanup) => {
        if (scenario.id === 'cleanup') registerCleanup(() => { throw new Error('Context disposal failed'); });
        return { fixtures: {}, registerCleanup };
      }, execute: async scenario => { if (scenario.id === 'falsy') throw undefined; },
    });
    expect(results.map(result => result.status)).toEqual(['failed', 'failed']);
    expect(() => assertCompleteResults(scenarios, results)).toThrow();
  });
  test('the actual secondary page is captured before its context closes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'scenario-diagnostic-'));
    const calls: string[] = [];
    const page = (name: string) => ({
      isClosed: () => false, on: () => {}, off: () => {}, locator: () => ({}),
      screenshot: async () => { calls.push(`capture:${name}`); },
    } as unknown as Page);
    const main = page('main');
    const secondary = page('secondary');
    try {
      await expect(withArtifactScope({ id: 'invite', expected: 'Invitation', directory, page: main }, async () => {
        observeScenarioPage(secondary);
        try { throw new Error('Secondary assertion failed'); }
        catch (error) { await captureScenarioPage(secondary); throw error; }
        finally { calls.push('close-secondary'); }
      })).rejects.toThrow('Secondary assertion failed');
      expect(calls.slice(0, 2)).toEqual(['capture:secondary', 'close-secondary']);
      expect(JSON.parse(await readFile(join(directory, 'invite.json'), 'utf8')).screenshot).toBe('invite.png');
    } finally { await rm(directory, { recursive: true }); }
  });
});

describe('screenshot interface and gallery', () => {
  test('filters reject typos and deduplicate device/language combinations', () => {
    expect(parseScreenshotOptions(['--device', 'mobile,mobile,tablet', '--locale', 'en']).devices).toEqual(['mobile', 'tablet']);
    expect(() => parseScreenshotOptions(['--device', 'watch'])).toThrow();
    expect(() => parseScreenshotOptions(['--device', 'constructor'])).toThrow();
    expect(() => parseScreenshotOptions(['--unknown'])).toThrow();
    expect(() => parseScreenshotOptions(['--out'])).toThrow();
  });
  test('failed captures remain visible and untrusted titles/diagnostics are escaped', () => {
    const manifest: VisualManifest = { profile: 'screenshots', generatedAt: '2026-10-05', sourceRevision: 'abc', sourceDigest: 'digest', sourceState: 'working-tree',
      browser: 'Chromium', theme: 'light', exclusions: [], results: [], captures: [{ scenarioId: 'x', checkpointId: 'form', title: '<script>oops</script>', module: 'school',
        surface: '/students', locale: 'fr', device: 'mobile', viewport: { width: 390, height: 844 }, status: 'failed', detail: '<img src=x onerror=alert(1)>' }] };
    const gallery = renderVisualGallery(manifest);
    expect(gallery).toContain('1 failed or blocked');
    expect(gallery).toContain('&lt;script&gt;');
    expect(gallery).not.toContain('<img src=x');
    expect(safeArtifactName('/x?modal=y')).not.toBe(safeArtifactName('/x/modal=y'));
  });
});
