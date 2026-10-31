import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { resolveEndpoint, type MatrixEntities } from '../../../scripts/qa-matrix-support';
import { navigateSpaPage } from '../../../scripts/qa-harness-ui';

export interface ViewSurface {
  id: string;
  feature: string;
  path: string;
  title: string;
  kind: 'page' | 'modal';
  identity: 'owner' | 'anonymous';
  target?: keyof MatrixEntities;
}

export async function assertViewSurface(page: Page, surface: Pick<ViewSurface, 'path' | 'kind'>): Promise<void> {
  let url = new URL(page.url());
  if (surface.path.startsWith('/login')) {
    await page.locator('[data-testid="auth-panel"]:visible, [data-testid="demo-account-list"]:visible').first().waitFor();
  } else if (surface.path.startsWith('/account/security')) {
    await page.getByTestId('account-identifier').first().waitFor({ state: 'visible' });
    await page.getByTestId('authenticator-state').waitFor({ state: 'visible' });
  } else {
    await page.locator('main, [role="main"], [role="dialog"].ui-drawer').first().waitFor({ state: 'visible' });
  }
  await page.waitForFunction(() => !document.querySelector('[role="status"] .animate-spin, [aria-busy="true"]'));
  if (!surface.path.startsWith('/login') && !surface.path.startsWith('/invite') && !surface.path.startsWith('/onboarding') && !surface.path.startsWith('/account/security')) {
    await page.getByTestId('app-shell').waitFor({ state: 'visible' });
    url = new URL(page.url());
    assert(!url.pathname.startsWith('/login') && !url.pathname.startsWith('/onboarding'), `View redirected to ${url.pathname}`);
    const error = page.getByRole('alert').filter({ has: page.getByRole('button', { name: /retry|réessayer/i }) });
    assert(!await error.count(), 'Page displayed a load-error state');
  }
  if (surface.kind === 'modal') {
    const expected = new URL(surface.path, 'http://localhost').searchParams;
    // The old grading deep link now opens the combined level editor.
    if (surface.path.startsWith('/configuration/structure/') && expected.get('modal') === 'level-grading') {
      expected.set('modal', 'edit-level');
    }
    for (const key of ['modal', 'modalStep', 'modalTab']) {
      if (expected.has(key)) assert.equal(new URL(page.url()).searchParams.get(key), expected.get(key), `Requested ${key} was rejected or changed`);
    }
    await page.getByRole('dialog').last().waitFor({ state: 'visible' });
  }
}

/** Used by integration navigation/dialog checks and visual checkpoint steps. */
export async function openViewSurface(page: Page, base: string, surface: ViewSurface, entities: MatrixEntities): Promise<void> {
  let path = surface.path.replace('/timetable/[id]', '/timetable/[sessionId]').replace('/attendance/[id]', '/attendance/[dayId]');
  // The required report-configuration surface now lives in the combined level editor.
  const reportPolicy = path === '/configuration/structure/details?modal=create';
  if (reportPolicy) path = '/configuration/structure/details?modal=edit-level';
  const resolved = resolveEndpoint(path, base, entities);
  assert(resolved && !/\[[^\]]+\]/.test(resolved), `Required fixture missing for ${surface.path}`);
  const url = new URL(resolved);
  if (surface.target) {
    const target = entities[surface.target];
    assert(typeof target === 'string' && target, `Required modal fixture missing: ${surface.target}`);
    url.searchParams.set('modalTarget', target);
  }
  await navigateSpaPage(page, url.toString());
  // Verify the resolved identity/tab, not merely that some shell is visible.
  await page.waitForURL(current => decodeURIComponent(current.pathname) === decodeURIComponent(url.pathname));
  await assertViewSurface(page, { path, kind: surface.kind });
  if (reportPolicy) await page.getByTestId('form-modal').locator('#grading-scale:enabled').waitFor({ state: 'visible' });
}
