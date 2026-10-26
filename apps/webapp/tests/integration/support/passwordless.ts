import type { Page } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolveAuthUrl } from './integration-hosts';

export async function peekOtp(email: string, channel = 'email', challenge?: string): Promise<string> {
  const mailbox = process.env.EDAYA_TEST_OTP_FILE;
  if (mailbox) {
    const messages = (await readFile(mailbox, 'utf8')).trim().split('\n').filter(Boolean)
      .map(line => JSON.parse(line) as { channel: string; destination: string; code: string });
    const delivery = messages.findLast(message => message.channel === channel && message.destination === email.trim().toLowerCase());
    if (!delivery || !/^\d{6}$/.test(delivery.code)) throw new Error('Required OTP transport delivery missing');
    return delivery.code;
  }
  const authUrl = resolveAuthUrl();
  if (!challenge) throw new Error('Challenge-based OTP access requires the current challenge or a private captured mailbox');
  const response = await fetch(`${authUrl}/auth/edaya/testing/otp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ challenge }) });
  if (!response.ok) throw new Error(`Local OTP peek failed (${response.status})`);
  return (await response.json() as { otp: string }).otp;
}

export async function sendOtpThroughUi(page: Page, email: string): Promise<void> {
  await page.locator('[data-testid="auth-identifier"]:visible').fill(email);
  await page.locator('[data-testid="auth-terms"]:visible [role="status"]').filter({ hasText: /Loading|Chargement/ }).waitFor({ state: 'hidden' });
  const acceptance = page.locator('[data-testid="auth-terms-accept"]:visible');
  if (await acceptance.count()) await acceptance.check();
  const sent = page.waitForResponse(response => response.url().endsWith('/auth/edaya/otp/start'));
  await page.locator('[data-testid="auth-submit"]:visible').click();
  const response = await sent;
  if (!response.ok()) throw new Error(`OTP send failed (${response.status()})`);
  await page.locator('[data-testid="auth-code"]:visible').waitFor({ state: 'visible' });
}

export async function verifyOtpThroughUi(page: Page, _email: string): Promise<void> {
  await page.locator('[data-testid="auth-code"]:visible').fill('');
  await page.locator('[data-testid="auth-code"]:visible').fill(await revealTestCode(page));
  await page.locator('[data-testid="auth-submit"]:visible').click();
}

export async function passwordlessApiLogin(page: Page, origin: string, email: string): Promise<void> {
  const authUrl = resolveAuthUrl();
  const headers = { origin, 'content-type': 'application/json' };
  const sent = await page.request.post(`${authUrl}/auth/edaya/otp/start`, { headers, data: { kind: 'email', value: email, channel: 'email' } });
  if (!sent.ok()) throw new Error(`OTP send failed (${sent.status()})`);
  const { challenge } = await sent.json();
  const verified = await page.request.post(`${authUrl}/auth/edaya/otp/verify`, { headers, data: { challenge, code: await peekOtp(email, 'email', challenge) } });
  if (!verified.ok() || (await verified.json()).state !== 'complete') throw new Error('Completed Account authentication required');
}

export async function revealTestCode(page: Page, purpose = 'login'): Promise<string> {
  const target = page.locator(`[data-testid="auth-panel"][data-purpose="${purpose}"]:visible`);
  await target.getByTestId('auth-test-reveal').click();
  await target.getByTestId('auth-test-code').waitFor();
  const code = await target.getByTestId('auth-test-code').innerText();
  if (!/^\d{6}$/.test(code)) throw new Error('Test code missing');
  if (await target.getByTestId('auth-code').inputValue()) throw new Error('Revealing must leave verification input empty');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await target.getByTestId('auth-test-copy').click();
  if (await page.evaluate(() => navigator.clipboard.readText()) !== code) throw new Error('Copy failed');
  return code;
}
