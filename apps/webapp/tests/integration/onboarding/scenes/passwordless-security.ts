import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import type { Page, Locator } from 'playwright';
import { peekOtp, sendOtpThroughUi, verifyOtpThroughUi } from '../../support/passwordless';
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
export async function runPhoneOtp(page: Page, base: string, channel: 'telegram' | 'whatsapp') {
  if (!process.env.EDAYA_TEST_OTP_FILE) throw new Error('Phone OTP requires the captured-delivery Identity entry');
  const phone = `+22507${Date.now().toString().slice(-8)}`;
  await page.goto(`${base}/login`);
  const form = panel(page);
  await form.locator('select').selectOption(channel);
  await sendOtpThroughUi(page, phone);
  const verified = await verify(form, await peekOtp(phone, channel), 'otp/verify');
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
  await sendOtpThroughUi(page, email);
  const oldCode = await peekOtp(email);
  await panel(page).getByRole('button', { name: /resend|renvoyer/i }).click();
  await sendOtpThroughUi(page, email);
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
  await page.getByRole('button', { name: /show|afficher/i }).click();
  await page.getByTestId('account-identifier').filter({ hasText: email }).waitFor();
  const link = panel(page, 'link');
  await link.getByTestId('auth-identifier').fill(alias);
  await link.locator('input[type="checkbox"]').check();
  await link.getByTestId('auth-submit').click();
  await link.getByTestId('auth-code').waitFor();
  await verify(link, await peekOtp(alias), 'otp/verify');
  await page.getByTestId('account-identifier').filter({ hasText: alias }).waitFor();
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
  await page.getByTestId('totp-enabled').waitFor();
  await withIsolatedPage(page.context().browser()!, async login => {
    await login.goto(`${base}/login`);
    await sendOtpThroughUi(login, alias);
    await verify(panel(login), await peekOtp(alias), 'otp/verify');
    await login.locator('[data-testid="auth-panel"][data-state="totp_required"]:visible').waitFor();
    await verify(panel(login), totp(secret, 30_000), 'totp/verify');
    await login.waitForURL(/\/onboarding/);
  });
  await page.reload();
  await page.getByRole('button', { name: /show|afficher/i }).click();
  await page.getByTestId('totp-enabled').waitFor();
  await page.getByTestId('account-identifier').filter({ hasText: alias }).waitFor();
  // Unlinking revokes the session. The surviving alias must require OTP + TOTP.
  await page.getByTestId('account-identifier').filter({ hasText: email }).getByRole('button').click();
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
  const auth = process.env.AUTH_URL!;
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
