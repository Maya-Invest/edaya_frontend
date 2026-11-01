import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

ensurePlaywrightChromium();
const origin = process.env.WEBAPP_URL ?? 'http://127.0.0.1:5173';
const apiOrigin = process.env.API_URL ?? 'http://localhost:9999';
assert(['127.0.0.1', 'localhost'].includes(new URL(apiOrigin).hostname), 'Use an isolated local API origin');
const output = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve('.focused-run/account-settings-ui');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: { path: string; body: any }[] = [];
  const email = 'aminata.kone.with.a.long.account.address@example.test';
  const identifiers = [{ id: 'primary', kind: 'email', value: email, recoveryEligible: true }, { id: 'backup', kind: 'email', value: 'backup@example.test', recoveryEligible: false }];
  const snapshot = { user: { id: 'login', accountId: 'login', email, phone: null, name: 'Aminata Koné', emailVerified: true }, account: { id: 'login', identifiers }, session: { id: 'fixture-session', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() } };
  const staff = { id: 'secretary', schoolId: 'school', firstName: 'Aminata', lastName: 'Koné', name: 'Aminata Koné', department: 'Direction', subjectId: 'login', email, notificationEmail: null as string | null, notificationPhone: null as string | null };
  let failSave = false;
  let failSecurity = false;
  let linkAttempts = 0;
  const primary = (challenge: string) => ({ state: "primary_required", challenge, lifecycle: "pending", channel: "email", delivery: "sent", expiresAt: Date.now() + 300000, nextResendAt: Date.now() + 60000, serverNow: Date.now(), actions: { resend: false, sms: false } });
  const grants = ['STAFF_MANAGE', 'SCHOOL_MESSAGES_READ', 'SCHOOL_MESSAGES_REPLY'].map(permission => ({ permission, scopes: [{ kind: 'school' }] }));
  await page.route(`${apiOrigin}/**`, async route => {
    const path = new URL(route.request().url()).pathname;
    const input = route.request().postData() ? route.request().postDataJSON() : {};
    requests.push({ path, body: input });
    let response: any = [];
    let status = 200;
    if (path.endsWith('/access-token')) response = { accessToken: 'fixture.payload.signature', expiresAt: new Date(Date.now() + 3600000).toISOString() };
    if (path.endsWith('/session')) response = snapshot;
    if (path.endsWith('/security')) { response = { totpEnabled: false }; if (failSecurity) { status = 503; response = { code: 'unavailable', message: 'Security unavailable' }; } }
    if (path.endsWith('/terms')) response = { enforced: false, document: null };
    if (path.endsWith('/identifiers/start')) {
      linkAttempts++;
      if (linkAttempts === 1) { status = 401; response = { code: 'reauthentication_required', message: 'Verify your identity' }; }
      else response = primary('fixture-link');
    }
    if (path.endsWith('/otp/start')) response = primary('fixture-identity');
    if (path.endsWith('/otp/verify')) {
      if (input.challenge === 'fixture-link') { identifiers.push({ id: 'linked', kind: 'email', value: 'linked@example.test', recoveryEligible: true }); response = { state: 'linked', account: snapshot.account }; }
      else response = { ...snapshot, state: 'complete' };
    }
    if (path.endsWith('/methods')) response = { email: true, phone: false };
    if (path.endsWith('/authorization/profiles')) response = { profiles: [{ kind: 'staff', actorId: 'secretary', schoolId: 'school', schoolName: 'Oak School' }] };
    if (path.endsWith('/authorization/effective-grants')) response = { kind: 'staff', actorId: 'secretary', schoolId: 'school', grants };
    if (path.endsWith('/staff-members/secretary')) response = staff;
    if (path.endsWith('/onboarding/account-status')) response = { wizardCompleted: true, maxReachedStep: 4, schoolStepSubmitted: true, structureStepSubmitted: true };
    if (path.includes('list-conversations')) response = { items: [], total: 0, unreadCount: 0, offset: 0, limit: 25 };
    if (path.includes('get-app-shell-counts')) response = { activeEnrollmentCountsByClass: {}, studentCount: 0, guardianCount: 0, staffCount: 0, teacherCount: 0 };
    if (path.endsWith('/schools/school')) response = { id: 'school', name: 'Oak School', shortName: 'Oak', timeZone: 'UTC' };
    if (path.includes('update-notification-contact')) {
      if (failSave) { status = 500; response = { message: 'Contact save failed' }; }
      else { Object.assign(staff, input); response = { notificationEmail: staff.notificationEmail, notificationPhone: staff.notificationPhone }; }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.addInitScript(() => { sessionStorage.setItem('edaya:auth-gate', '1'); if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en'); });
  console.log('Checking account composition, keyboard and notification persistence');
  await page.goto(`${origin}/school/messages`);
  await page.getByRole('button', { name: 'Open my account', exact: true }).click({ timeout: 20000 });
  const dialog = page.getByTestId('account-profile-dialog');
  await dialog.waitFor();
  assert.deepEqual(await dialog.getByRole('tab').allTextContents(), ['Profile', 'Notifications', 'Security']);
  assert.equal(await dialog.locator('input[type=email]').count(), 0);
  const profile = dialog.getByRole('tab', { name: 'Profile', exact: true });
  await profile.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await profile.getAttribute('aria-selected'), 'true', 'Arrow navigation does not discard or activate another tab');
  await page.keyboard.press('Enter');
  await dialog.getByRole('heading', { name: 'Notifications', exact: true }).waitFor();
  assert.equal(await dialog.getByTestId('notification-save-actions').count(), 0);
  await dialog.getByRole('radio', { name: 'Use a different email', exact: true }).check();
  const custom = dialog.locator('input[type=email]');
  await custom.fill('notices@example.test');
  await dialog.getByRole('tab', { name: 'Security', exact: true }).click();
  const discard = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Discard changes?', exact: true }) });
  await discard.getByRole('button', { name: 'Keep editing', exact: true }).click();
  assert.equal(await dialog.getByRole('tab', { name: 'Notifications', exact: true }).getAttribute('aria-selected'), 'true');
  assert.equal(await custom.inputValue(), 'notices@example.test');
  failSave = true;
  await dialog.getByTestId('notification-save-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('form[aria-busy="false"]') !== null);
  assert.equal(await custom.inputValue(), 'notices@example.test');
  assert(await dialog.getByTestId('notification-save-actions').isVisible());
  failSave = false;
  await dialog.getByTestId('notification-save-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
  await dialog.getByTestId('notification-save-actions').waitFor({ state: 'hidden' });
  assert.equal(staff.notificationEmail, 'notices@example.test');
  await custom.fill('other@example.test');
  await dialog.getByTestId('notification-save-actions').getByRole('button', { name: 'Discard changes', exact: true }).click();
  assert.equal(await custom.inputValue(), 'notices@example.test', 'Discard restores the last saved value');
  await dialog.getByRole('radio', { name: /Use my sign-in email/ }).check();
  await dialog.getByTestId('notification-save-actions').getByRole('button', { name: 'Save changes', exact: true }).click();
  await dialog.getByTestId('notification-save-actions').waitFor({ state: 'hidden' });
  assert.equal(staff.notificationEmail, null, 'Default delivery is stored as an absent override');
  await dialog.getByRole('tab', { name: 'Security', exact: true }).click();
  await dialog.getByTestId('account-identifier').first().waitFor();
  assert.equal(await dialog.getByTestId('auth-panel').count(), 0, 'Security loads a summary before any authentication flow');
  assert(await dialog.getByText(email, { exact: true }).count() > 0);
  await dialog.getByTestId('account-identifier').first().getByRole('button').click();
  const remove = page.getByRole('menuitem', { name: 'Remove sign-in method', exact: true });
  assert(await remove.isDisabled(), 'The last recovery method cannot be removed');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Add sign-in method', exact: true }).click();
  assert.equal(await dialog.getByTestId('auth-panel').getAttribute('data-purpose'), 'link');
  await dialog.getByTestId('auth-identifier').fill('draft@example.test');
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await discard.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await dialog.getByTestId('account-identifier').first().waitFor();
  assert.equal(requests.filter(row => /identifiers\/start|totp\/enroll|otp\/start/.test(row.path)).length, 0, 'Viewing and dismissing actions sends no mutation');
  await dialog.getByRole('button', { name: 'Add sign-in method', exact: true }).click();
  await dialog.getByTestId('auth-identifier').fill('linked@example.test');
  await dialog.getByRole('checkbox').check();
  await dialog.getByTestId('auth-submit').click();
  await page.waitForFunction(() => document.querySelector('[data-purpose="login"]') !== null);
  await dialog.getByTestId('auth-submit').click();
  await dialog.getByTestId('auth-code').fill('123456');
  await dialog.getByTestId('auth-submit').click();
  await page.waitForFunction(() => document.querySelector('[data-purpose="link"]') !== null);
  assert.equal(await dialog.getByTestId('auth-identifier').inputValue(), 'linked@example.test');
  assert(await dialog.getByRole('checkbox').isChecked(), 'Verification retains the recovery option');
  assert.equal(linkAttempts, 1, 'Verification does not replay the pending link command');
  await dialog.getByTestId('auth-submit').click();
  await dialog.getByTestId('auth-code').fill('123456');
  await dialog.getByTestId('auth-submit').click();
  await dialog.getByTestId('account-identifier').nth(2).waitFor();
  assert.equal(requests.filter(row => row.path.endsWith('/identifiers/start')).at(-1)!.body.recoveryEligible, true);
  // Reload clears earlier transient feedback and checks the URL-selected section.
  await page.reload();
  await dialog.getByTestId('account-identifier').first().waitFor();
  console.log('Checking security summary and localized responsive layouts');
  await mkdir(output, { recursive: true });
  for (const language of ['en', 'fr']) {
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByTestId('language-selector').click();
    await page.getByTestId(`language-option-${language}`).click();
    await page.getByRole('button', { name: language === 'en' ? 'Open my account' : 'Ouvrir mon compte', exact: true }).click();
    for (const width of [390, 1280]) for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
      for (let index = 0; index < 3; index++) {
        await dialog.getByRole('tab').nth(index).click();
        if (index === 2) await dialog.getByTestId('account-identifier').first().waitFor();
        const geometry = await dialog.evaluate(element => {
          const body = element.querySelector('[data-account-scroll]')!;
          const box = element.getBoundingClientRect();
          const close = element.querySelector('header button')!.getBoundingClientRect();
          return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, overflow: body.scrollWidth > body.clientWidth + 1, offenders: [...body.querySelectorAll('*')].filter(child => child.getBoundingClientRect().right > box.right + 1).slice(0, 8).map(child => child.outerHTML.slice(0, 350)), closeBottom: close.bottom, closeRight: close.right, viewportWidth: innerWidth, viewportHeight: innerHeight };
        });
        assert(geometry.x >= -1 && geometry.y >= -1 && geometry.right <= geometry.viewportWidth + 1 && geometry.bottom <= geometry.viewportHeight + 1, `Dialog fits ${language}/${width}/${scale}`);
        assert(!geometry.overflow, `Content reflows ${language}/${width}/${scale}/tab${index}: ${geometry.offenders.join("; ")}`);
        assert(geometry.closeBottom <= 1000 && geometry.closeRight <= width, 'Close remains reachable');
        if (scale === 1) await page.screenshot({ path: resolve(output, `${language}-${width}-tab${index}.png`) });
      }
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '16px');
    if (language === 'en') await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    else await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    // Reopen to keep the beginning of the next locale iteration independent.
    await page.getByRole('button', { name: language === 'en' ? 'Open my account' : 'Ouvrir mon compte', exact: true }).click();
  }
  console.log('Checking direct security entry and read retry');
  await writeFile(resolve(output, 'capture-conditions.json'), JSON.stringify({ tokenVersion: JSON.parse(await readFile(resolve('../../design-system/tokens.json'), 'utf8')).version, locales: ['en', 'fr'], viewportWidths: [390, 1280], viewportHeight: 1000, textScales: [1, 2], capturedTextScale: 1, source: 'execution.json', data: 'isolated fixture APIs', sections: ['profile', 'notifications', 'security'] }, null, 2));
  await page.goto(`${origin}/account/security`);
  await page.getByTestId('account-identifier').first().waitFor();
  failSecurity = true;
  await page.reload();
  await page.getByRole('alert').filter({ hasText: 'Security unavailable' }).waitFor();
  assert.equal(await page.getByTestId('auth-panel').count(), 0, 'Failed reads offer retry rather than asking for sign-in');
  failSecurity = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await page.getByTestId('account-identifier').first().waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: account tabs, manual keyboard activation, dirty guards, save failure/retry/discard, default contact, security summary/action isolation/recovery protection, direct entry, retry and FR/EN mobile/desktop 200% reflow');
} catch (error) {
  console.error(error);
  for (const page of browser.contexts().flatMap(context => context.pages())) console.error((await page.locator('body').innerText()).slice(-7000));
  throw error;
} finally { await browser.close(); }
