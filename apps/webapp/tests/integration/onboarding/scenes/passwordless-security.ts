import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import type { Page, Locator } from 'playwright';
import { revealTestCode, peekOtp, sendOtpThroughUi, verifyOtpThroughUi } from '../../support/passwordless';
import { uniqueOnboardingEmail } from '../support/capture';
import { withIsolatedPage } from '../support/invite';

function panel(page: Page, purpose = 'login'): Locator {
  return page.locator(`[data-testid="auth-panel"][data-purpose="${purpose}"]:visible`);
}
async function verify(target: Locator, code: string, endpoint: string, expectedOk = true) {
  await target.getByTestId('auth-code').fill(code);
  const response = target.page().waitForResponse(r => r.url().endsWith(`/auth/edaya/${endpoint}`));
  await target.getByTestId('auth-submit').click();
  const completed = await response;
  if (completed.ok() !== expectedOk) throw new Error(`${endpoint}: unexpected HTTP ${completed.status()}`);
  if (!expectedOk) await target.getByRole('alert').waitFor();
  return completed;
}
function totp(secret: string, offsetMs = 0): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const letter of secret.replace(/=+$/, '').toUpperCase()) {
    const index = alphabet.indexOf(letter);
    if (index < 0) throw new Error('Invalid authenticator enrollment secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor((Date.now() + offsetMs) / 30_000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  return String((digest.readUInt32BE(digest[digest.length - 1]! & 15) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}
export async function runPhoneOtp(page: Page, base: string, channel: 'sms' | 'whatsapp') {
  if (!process.env.EDAYA_TEST_OTP_FILE) throw new Error('Phone OTP requires the captured-delivery Identity entry');
  const phone = `+22507${Date.now().toString().slice(-8)}`;
  await page.goto(`${base}/login`);
  const form = panel(page);
  if (await form.locator('select').count()) throw new Error('Login still requires a contact type selection');
  let sent = 0;
  const countSend = (request: import('playwright').Request) => {
    if (request.url().endsWith('/auth/edaya/otp/start')) sent++;
  };
  page.on('request', countSend);
  await form.getByTestId('auth-identifier').fill('0712345678');
  await form.getByTestId('auth-submit').click();
  await form.getByRole('alert').waitFor();
  if (sent || await form.getByTestId('auth-code').count()) throw new Error('Invalid contact started verification');
  page.off('request', countSend);
  await sendOtpThroughUi(page, `${phone.slice(0, 4)} (${phone.slice(4, 6)}) ${phone.slice(6)}`);
  if (channel === 'sms') {
    const clock = process.env.EDAYA_TEST_CLOCK_FILE;
    if (!clock) throw new Error('SMS switch requires the integration clock');
    if (await form.getByTestId('auth-sms').isEnabled()) throw new Error('SMS bypassed the initial cooldown');
    const oldCode = await revealTestCode(page);
    await form.getByTestId('auth-code').fill(oldCode);
    try {
      await writeFile(clock, '61000');
      const resent = page.waitForResponse(r => r.url().endsWith('/auth/edaya/otp/resend'));
      await form.getByTestId('auth-sms').click();
      const response = await resent;
      if (!response.ok() || (await response.json()).channel !== 'sms') throw new Error('SMS switch failed');
      if (await form.getByTestId('auth-test-code').count()) throw new Error('Replacement retained the revealed code');
      if (await form.getByTestId('auth-code').inputValue()) throw new Error('Replacement retained the old code');
      if (await form.getByTestId('auth-sms').isVisible()) throw new Error('SMS offered a second channel switch');
      const code = await peekOtp(phone, 'sms');
      if (oldCode !== code) await verify(form, oldCode, 'otp/verify', false);
    } finally { await writeFile(clock, '0'); }
  }
  await form.getByTestId('auth-code').fill('');
  const verified = await verify(form, await revealTestCode(page), 'otp/verify');
  const replay = await page.request.post(verified.url(), {
    headers: { origin: base }, data: verified.request().postDataJSON(),
  });
  if (replay.ok()) throw new Error('Consumed OTP challenge accepted a second verification');
  await page.waitForURL(/\/onboarding/);
  await page.reload();
  await page.waitForURL(/\/onboarding/);
  if (await page.getByTestId('auth-code').isVisible()) throw new Error('Phone session did not restore');
}
export async function runOtpResend(page: Page, base: string) {
  const email = uniqueOnboardingEmail();
  await page.goto(`${base}/login`);
  await sendOtpThroughUi(page, ` ${email.toUpperCase()} `);
  const oldCode = await revealTestCode(page);
  let release!: () => void;
  let received!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { received = resolve; });
  await page.route('**/auth/edaya/testing/otp', async route => {
    const response = await route.fetch();
    received();
    await held;
    await route.fulfill({ response });
  }, { times: 1 });
  await panel(page).getByTestId('auth-test-reveal').click();
  await ready;
  const clock = process.env.EDAYA_TEST_CLOCK_FILE;
  if (!clock) throw new Error('Resend requires the integration clock');
  try {
    await writeFile(clock, '61000');
    const resent = page.waitForResponse(r => r.url().endsWith('/auth/edaya/otp/resend'));
    await panel(page).getByTestId('auth-resend').click();
    if (!(await resent).ok()) throw new Error('Resend request failed');
    if (await panel(page).getByTestId('auth-test-code').count()) throw new Error('Resend retained the revealed code');
    if (await panel(page).getByTestId('auth-code').inputValue()) throw new Error('Resend retained the old code');
    release();
    await page.waitForTimeout(100);
    if (await panel(page).getByTestId('auth-test-code').count()) throw new Error('Late lookup revealed a superseded code');
  } finally { release(); await writeFile(clock, '0'); }
  // A newly generated code can coincidentally match; stale challenges are tested separately.
  const code = await peekOtp(email);
  if (oldCode !== code) await verify(panel(page), oldCode, 'otp/verify', false);
  await verify(panel(page), code, 'otp/verify');
  await page.waitForURL(/\/onboarding/);
}
export async function runOtpExpiry(page: Page, base: string) {
  const clock = process.env.EDAYA_TEST_CLOCK_FILE;
  if (!clock) throw new Error('OTP expiry requires the integration clock file');
  const email = uniqueOnboardingEmail();
  await page.goto(`${base}/login`);
  await sendOtpThroughUi(page, email);
  const code = await peekOtp(email);
  try {
    await writeFile(clock, '360000');
    await verify(panel(page), code, 'otp/verify', false);
    if (!new URL(page.url()).pathname.endsWith('/login')) throw new Error('Expired OTP authenticated');
  } finally { await writeFile(clock, '0'); }
}
export async function runAccountSecurity(page: Page, base: string) {
  const email = uniqueOnboardingEmail();
  const alias = uniqueOnboardingEmail();
  await page.goto(`${base}/login`);
  await sendOtpThroughUi(page, email);
  await verifyOtpThroughUi(page, email);
  await page.waitForURL(/\/onboarding/);
  await page.goto(`${base}/account/security`);
  await page.getByTestId('account-identifier').filter({ hasText: email }).waitFor();
  await page.getByRole('button', { name: /add sign-in method|ajouter un moyen de connexion/i }).click();
  const link = panel(page, 'link');
  await link.getByTestId('auth-identifier').fill(alias);
  await link.locator('input[type="checkbox"]').check();
  await link.getByTestId('auth-submit').click();
  await link.getByTestId('auth-code').waitFor();
  await verify(link, await revealTestCode(page, 'link'), 'otp/verify');
  await page.getByTestId('account-identifier').filter({ hasText: alias }).waitFor();
  await page.getByRole('button', { name: /set up authenticator|configurer l.application/i }).click();
  const enrollment = panel(page, 'enroll');
  await enrollment.getByTestId('auth-submit').click();
  await enrollment.getByTestId('auth-totp-secret').waitFor();
  const secret = (await enrollment.getByTestId('auth-totp-secret').innerText()).trim();
  await verify(enrollment, totp(secret), 'totp/confirm');
  const recovery = enrollment.getByTestId('auth-recovery-codes');
  await recovery.waitFor();
  const codes = (await recovery.innerText()).trim().split(/\s+/);
  if (codes.length !== 10 || new Set(codes).size !== 10) throw new Error('Expected ten distinct recovery codes');
  await enrollment.getByRole('button').click();
  await page.getByTestId('authenticator-state').filter({ hasText: /authenticator enabled|application d.authentification activée/i }).waitFor();
  await withIsolatedPage(page.context().browser()!, async login => {
    await login.goto(`${base}/login`);
    await sendOtpThroughUi(login, alias);
    await verify(panel(login), await peekOtp(alias), 'otp/verify');
    await login.locator('[data-testid="auth-panel"][data-state="totp_required"]:visible').waitFor();
    await verify(panel(login), totp(secret, 30_000), 'totp/verify');
    await login.waitForURL(/\/onboarding/);
  });
  await page.reload();
  await page.getByTestId('authenticator-state').filter({ hasText: /authenticator enabled|application d.authentification activée/i }).waitFor();
  await page.getByTestId('account-identifier').filter({ hasText: alias }).waitFor();
  // Unlinking revokes the session. The surviving alias must require OTP + TOTP.
  await page.getByTestId('account-identifier').filter({ hasText: email }).getByRole('button').click();
  await page.getByRole('menuitem', { name: /remove sign-in method|retirer ce moyen de connexion/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /unlink|dissocier/i }).click();
  await page.waitForURL(/\/login/);
  await sendOtpThroughUi(page, alias);
  await verify(panel(page), await peekOtp(alias), 'otp/verify');
  await panel(page).locator('[data-testid="auth-code"]').waitFor();
  await page.locator('[data-testid="auth-panel"][data-state="totp_required"]:visible').waitFor();
  // Recovery consumes one code and demands replacement enrollment before a session.
  await panel(page).getByRole('button', { name: /recovery|récupération/i }).click();
  await verify(panel(page), codes[0]!, 'recovery');
  await page.getByTestId('auth-totp-secret').waitFor();
  if (new URL(page.url()).pathname !== '/login') throw new Error('Recovery skipped authenticator replacement');
  await withIsolatedPage(page.context().browser()!, async reuse => {
    await reuse.goto(`${base}/login`);
    await sendOtpThroughUi(reuse, alias);
    await verify(panel(reuse), await peekOtp(alias), 'otp/verify');
    await reuse.locator('[data-testid="auth-panel"][data-state="totp_required"]:visible').waitFor();
    await panel(reuse).getByRole('button', { name: /recovery|récupération/i }).click();
    await verify(panel(reuse), codes[0]!, 'recovery', false);
    if (new URL(reuse.url()).pathname !== '/login') throw new Error('Consumed recovery code authenticated');
  });
}

/** Enforce the policy port for a provisioned owner while keeping real identity,
 * provider, enrollment and session handling. Role-policy resolution is covered
 * separately by backend integration tests. */
export async function runOwnerTotpPolicy(owner: Page, base: string, email: string) {
  const file = process.env.EDAYA_TEST_POLICY_FILE;
  if (!file) throw new Error('Owner MFA scenario requires the test policy fixture');
  const auth = process.env.API_URL!;
  const response = await owner.request.post(`${auth}/auth/edaya/session`, { headers: { origin: base }, data: {} });
  if (!response.ok()) throw new Error('Owner session fixture missing');
  const { account } = await response.json() as { account: { id: string } };
  await writeFile(file, JSON.stringify([account.id]), { mode: 0o600 });
  try {
    const stale = await owner.request.post(`${auth}/auth/edaya/access-token`, { headers: { origin: base }, data: { resource: process.env.API_URL } });
    if (stale.ok()) throw new Error('Primary-only owner session bypassed newly required MFA');
    await withIsolatedPage(owner.context().browser()!, async login => {
      await login.goto(`${base}/login`);
      await sendOtpThroughUi(login, email);
      await verify(panel(login), await peekOtp(email), 'otp/verify');
      await login.getByTestId('auth-totp-secret').waitFor();
      const unauthenticated = await login.request.post(`${auth}/auth/edaya/session`, { headers: { origin: base }, data: {} });
      if (unauthenticated.ok()) throw new Error('Owner authenticated before required enrollment');
      const secret = (await login.getByTestId('auth-totp-secret').innerText()).trim();
      await verify(panel(login), totp(secret), 'totp/confirm');
      await login.getByTestId('auth-recovery-codes').waitFor();
      await panel(login).getByRole('button').click();
      await login.waitForURL(/\/dashboard/);
      const restored = await login.request.post(`${auth}/auth/edaya/session`, { headers: { origin: base }, data: {} });
      const session = await restored.json() as { session: { secondFactorAt: string | null } };
      if (!restored.ok() || !session.session.secondFactorAt) throw new Error('Owner session missing second-factor proof');
    });
  } finally { await writeFile(file, '[]'); }
}

export async function runTestOtpLifecycle(page: Page, base: string) {
  let capabilities = 0;
  page.on('request', request => { if (request.url().endsWith('/auth/edaya/testing/capabilities')) capabilities++; });
  await page.goto(`${base}/login`);
  await sendOtpThroughUi(page, uniqueOnboardingEmail());
  await revealTestCode(page);
  await page.waitForTimeout(3100);
  if (!(await panel(page).getByTestId('auth-test-code').count())) throw new Error('Routine status polling cleared a pending test code');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  if (await page.getByTestId('auth-test-code').count()) throw new Error('Backgrounding retained a revealed code');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await revealTestCode(page);
  await panel(page).getByTestId('auth-change-contact').click();
  if (await page.getByTestId('auth-test-code').count()) throw new Error('Reset retained a revealed code');
  await sendOtpThroughUi(page, uniqueOnboardingEmail());
  await revealTestCode(page);
  if (capabilities !== 1) throw new Error('Capabilities should be discovered once per client lifetime');
  await page.goto(`${base}/account/security`);
  if (await page.getByTestId('auth-test-code').count()) throw new Error('Screen departure retained a revealed code');
  await page.route('**/auth/edaya/testing/capabilities', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"not_found"}' }));
  await page.goto(`${base}/login`);
  await sendOtpThroughUi(page, uniqueOnboardingEmail());
  await page.waitForTimeout(100);
  if (await page.getByTestId('auth-test-reveal').count()) throw new Error('Unsupported server exposed test access');
}
