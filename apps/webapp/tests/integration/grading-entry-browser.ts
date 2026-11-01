import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { gradingFixtureConfig } from '../fixtures/grading/config';
import { createFixtureServer } from './support/fixture-server';

async function main() {
  ensurePlaywrightChromium();
  const root = resolve(import.meta.dirname, '../..');
  const output = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve(root, '.focused-run/grading-entry');
  mkdirSync(output, { recursive: true });
  const path = '/classes/class/evaluations/assessment/grading?task=grade-entry&taskTarget=assessment&taskPanel=entry&class-roster=1';
  const server = await createFixtureServer(gradingFixtureConfig(root), 'grading-entry', 14302, path);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(server.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const cells = page.locator('input[data-grade-input]');
    await cells.nth(29).waitFor();
    const second = cells.nth(1), third = cells.nth(2);
    await second.fill('14.5');
    await second.press('Enter');
    assert(await third.evaluate(el => el === document.activeElement));
    await third.fill('16');
    await third.press('Shift+Enter');
    assert(await second.evaluate(el => el === document.activeElement));
    assert.equal(await page.getByTestId('requests').innerText(), '[]', 'Typing never writes');
    const designation = page.locator('tbody tr').nth(3).locator('[aria-haspopup="listbox"]').first();
    await designation.click();
    await page.getByRole('option', { name: 'Absent', exact: true }).waitFor();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await designation.getByText('Absent', {exact:true}).waitFor();
    assert.equal(await page.getByTestId('requests').innerText(), '[]', 'Picker Enter does not submit');
    await page.screenshot({ path: resolve(output, 'class-entry.png') });
    await page.getByRole('button', { name: /Save changed marks \(3\)/ }).click();
    await page.getByRole('button', { name: /Save changed marks \(0\)/ }).waitFor();
    const writes = JSON.parse(await page.getByTestId('requests').innerText());
    assert.equal(writes.length, 3);
    assert.deepEqual(writes.map((write: {studentId:string}) => write.studentId), ['s2', 's3', 's4']);
    assert.equal(writes[0].score, 14.5);
    assert.equal(writes[1].score, 16);
    assert.equal(writes[2].designation, 'absent');
    assert.deepEqual(writes.map((write: {expectedRevision:number}) => write.expectedRevision), [3,4,5], 'Per-record revisions remain sequential');
    await second.fill('15');
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
    await page.getByTestId('confirm-modal').waitFor();
    await page.getByTestId('confirm-cancel').click();
    await page.getByTestId('confirm-modal').waitFor({ state: 'hidden' });
    assert.equal(await second.inputValue(), '15');
    assert.equal(JSON.parse(await page.getByTestId('requests').innerText()).length, 3);
    assert.deepEqual(errors, []);
    console.log('Grading entry passed: 30-row paper entry, Enter/Shift+Enter, picker isolation, explicit per-record save/revisions and dirty exit.');
  } catch(error) { await page.screenshot({path:resolve(output,'failure.png'),fullPage:true}); throw error; }
  finally { await browser.close(); await server.close(); }
}
void main().catch(error => { console.error(error); process.exitCode=1; });
