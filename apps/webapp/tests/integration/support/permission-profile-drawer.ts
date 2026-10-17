import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { uiCommand } from './ui-command';

/** Inspect a temporary profile without changing its permissions or bindings. */
export async function verifyPermissionProfileDrawer(page: Page, base: string, id: string) {
  const list = `${base}/configuration/permission-profiles?q=${id}`;
  const detail = `${base}/configuration/permission-profiles/${id}?q=${id}`;
  const drawer = page.getByTestId('permission-profile-drawer');
  const row = page.locator(`a[data-profile-id="${id}"]`);
  await page.goto(list);
  await row.waitFor();
  assert.equal(await row.getByRole('button').count(), 0, 'Drawer rows must not have action menus');
  await row.focus();
  await page.keyboard.press('Enter');
  await drawer.waitFor();
  assert.equal(await drawer.getByRole('checkbox').count(), 0);
  assert.equal(await drawer.locator('li[data-permission]').count(), 2);
  assert.equal(await drawer.locator('li[data-permission="GRADE_INPUT"] [data-scope-type="class_group"]').count(), 1);
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden' });
  assert.equal(new URL(page.url()).searchParams.get('q'), id);
  await page.waitForFunction(profileId => document.activeElement?.getAttribute('data-profile-id') === profileId, id);
  await row.click();
  await drawer.waitFor();
  await page.goBack();
  await drawer.waitFor({ state: 'hidden' });
  await page.goForward();
  await drawer.waitFor();
  await page.reload();
  await drawer.waitFor();
  await drawer.getByRole('button', { name: /^(edit|modifier)$/i }).click();
  const editor = page.getByTestId('form-modal');
  await editor.waitFor();
  await page.keyboard.press('Escape');
  await editor.waitFor({ state: 'hidden' });
  assert(await drawer.isVisible(), 'Escape closes the modal before the drawer');
  await page.waitForURL(url => !url.searchParams.has('modal'));
  await drawer.getByRole('button', { name: /^(edit|modifier)$/i }).click();
  await editor.waitFor();
  await editor.locator('input').nth(1).fill('Drawer update verified');
  const preview = await uiCommand(page, '/commands/configure-permission-profile', () => page.getByTestId('form-modal-submit').click());
  assert.equal(preview.request().postDataJSON().previewOnly, true);
  await page.getByTestId('form-modal-submit').getByText(/save|enregistrer/i).waitFor();
  const saved = await uiCommand(page, '/commands/configure-permission-profile', () => page.getByTestId('form-modal-submit').click());
  assert.notEqual(saved.request().postDataJSON().previewOnly, true);
  await editor.waitFor({ state: 'hidden' });
  await drawer.getByText('Drawer update verified').waitFor();
  assert.equal(await drawer.locator('li[data-permission]').count(), 2);
  for (const lang of ['en', 'fr']) {
    await page.evaluate(value => localStorage.setItem('lang', value), lang);
    await page.reload();
    await drawer.waitFor();
    assert.equal((await drawer.locator('li[data-permission="GRADE_INPUT"] [data-scope-type]').textContent())?.trim(), lang === 'en' ? 'Class group' : 'Classe');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="permission-profile-drawer"]');
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Math.round(rect.x) === 0 && Math.round(rect.width) === window.innerWidth && element.scrollWidth <= element.clientWidth;
    });
    const rect = await drawer.boundingBox();
    assert.equal(rect?.y, 0, 'Drawer has no top gap');
    assert.equal(Math.round(rect?.width ?? 0), 390);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.goto(`${base}/configuration/permission-profiles/missing-profile?q=${id}&modal=edit&modalTarget=missing-profile`);
  await page.waitForURL(url => url.pathname === '/configuration/permission-profiles' && !url.searchParams.has('modal'));
  await row.waitFor();
  assert.equal(new URL(page.url()).searchParams.get('q'), id);
  // Presentation gates are checked using a read-only effective-grants response.
  await page.route('**/authorization/effective-grants', async route => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ response, json: { ...data, grants: data.grants.filter((grant: { permission: string }) => grant.permission !== 'ACCESS_CONTROL_CONFIGURE') } });
  });
  await page.goto(detail);
  await drawer.waitFor();
  assert.equal(await drawer.getByRole('button', { name: /^(edit|modifier)$/i }).count(), 0);
  assert.equal(await drawer.getByRole('button', { name: /more actions|plus d.actions/i }).count(), 0);
  assert.equal(await drawer.locator('li[data-permission]').count(), 2);
  await page.unroute('**/authorization/effective-grants');
  await page.reload();
  await drawer.waitFor();
  await drawer.getByRole('button', { name: /close|fermer/i }).click();
  await drawer.waitFor({ state: 'hidden' });
}
