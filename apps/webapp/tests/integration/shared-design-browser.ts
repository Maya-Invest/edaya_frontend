import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { createFixtureServer } from './support/fixture-server';
import { verifyHarnessDialogBoundaries } from './support/harness-checks';
import { chooseOption } from './support/custom-select';

async function main() {
  ensurePlaywrightChromium();
  const root = resolve(import.meta.dirname, '../..');
  const output = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve(root, '.focused-run/shared-design');
  mkdirSync(output, { recursive: true });
  const server = await createFixtureServer({ root }, 'shared-design', 14301, '/__design');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const measurements: object[] = [];
  try {
    await verifyHarnessDialogBoundaries(page);
    if (!process.argv.includes('--drawer-only')) for (const language of ['en', 'fr']) for (const width of [360, 768, 1024, 1280]) for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${server.url}?referenceFrame=1&referenceLocale=${language}&referenceScale=${scale}`);
      const table = page.locator('#collections table').first();
      await table.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const measurement = await table.evaluate(el => ({
        page: document.documentElement.scrollWidth,
        pagePadding: getComputedStyle(document.querySelector('[data-design-reference]')!).paddingLeft,
        sectionPadding: getComputedStyle(document.querySelector('#controls')!).paddingLeft,
        textOverflow: [...document.querySelectorAll<HTMLElement>('[data-design-reference] h2, [data-design-reference] h3, [data-design-reference] p, [data-design-reference] dt, [data-design-reference] dd')].filter(element => {
          if (element.closest('.overflow-x-auto, table')) return false;
          const range = document.createRange();
          range.selectNodeContents(element);
          const bounds = element.getBoundingClientRect();
          return [...range.getClientRects()].some(box => box.right > bounds.right + 1 || box.left < bounds.left - 1);
        }).map(element => ({ tag: element.tagName, text: element.textContent?.slice(0, 120) })),
        headers: Array.from(el.querySelectorAll('thead tr')).map(row => row.getBoundingClientRect().height),
        rows: Array.from(el.querySelectorAll('tbody tr')).map(row => row.getBoundingClientRect().height),
        utility: Array.from(el.querySelectorAll('tr')).map(row => row.lastElementChild!.getBoundingClientRect().width),
        radius: getComputedStyle(el.closest('.ui-collection')!).borderRadius,
      }));
      assert.equal(measurement.pagePadding, width < 768 ? '16px' : '24px', 'Text enlargement preserves page gutters');
      assert.equal(measurement.sectionPadding, width < 768 ? '16px' : '24px', 'Text enlargement preserves specimen padding');
      assert.deepEqual(measurement.textOverflow, [], `${language}/${width}/${scale}: gallery text reflows within its container`);
      assert(measurement.page <= width + 1, `${language}/${width}/${scale}: page overflow`);
      assert(measurement.rows.every(height => height >= 48));
      assert(measurement.utility.every(size => Math.abs(size - 64) < 1));
      assert.equal(measurement.radius, '8px');
      measurements.push({ language, width, scale, ...measurement });
      if (language === 'fr' && width === 360 && scale === 2) {
        for (const id of ['controls', 'foundations', 'coverage']) {
          await page.locator(`#${id}`).evaluate(element => element.scrollIntoView({ block: 'start' }));
          await page.screenshot({ path: resolve(output, `${id}-fr-360-2.png`) });
        }
      }
      await page.locator('#collections').scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(output, `collections-${language}-${width}-${scale}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${server.url}?referenceFrame=1&referenceLocale=en`);
    const section = page.locator('#collections');
    await section.locator('table').waitFor();
    const dataWidths = () => section.locator('thead th').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
    const normal = await dataWidths();
    await section.getByTestId('collection-menu').click();
    await page.getByRole('menuitem', { name: 'Select records', exact: true }).click();
    await section.getByRole('checkbox', { name: 'Select row', exact: true }).first().click();
    assert.equal(await section.getByRole('checkbox', { name: 'Select loaded rows', exact: true }).getAttribute('aria-checked'), 'mixed');
    assert.deepEqual(await dataWidths(), normal, 'Selection must not shift data columns');
    await section.getByRole('button', { name: 'Clear selection', exact: true }).click();
    assert.equal(await section.getByRole('checkbox', { name: 'Select loaded rows', exact: true }).getAttribute('aria-checked'), 'false');
    await section.getByRole('button', { name: 'Exit selection', exact: true }).click();
    await section.getByRole('button', { name: 'Customize', exact: true }).click();
    assert(await page.getByRole('checkbox', { name: 'Student', exact: true }).isDisabled());
    await page.getByRole('checkbox', { name: 'Amount', exact: true }).uncheck();
    await page.getByRole('textbox', { name: 'Find a column', exact: true }).press('Escape');
    assert.equal(await section.getByRole('columnheader', { name: 'Amount', exact: true }).count(), 0);
    await section.getByRole('button', { name: 'Aminata Mariam Koné-Diabaté', exact: true }).click();
    const drawer = page.getByTestId('gallery-drawer');
    await page.waitForFunction(() => document.querySelector('[data-testid="gallery-drawer"]')?.getAnimations().some(animation => animation.effect?.getTiming().duration === 250));
    const entering = await drawer.evaluate(el => el.getAnimations().map(animation => ({ duration: animation.effect?.getTiming().duration, frames: (animation.effect as KeyframeEffect).getKeyframes() })));
    assert(entering.some(animation => animation.duration === 250 && animation.frames.some(frame => String(frame.transform).includes('translate'))), 'Shared drawer must slide in using the enter-motion token');
    await drawer.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    assert.equal(Math.round((await drawer.boundingBox())!.width), 640);
    assert.equal(await drawer.evaluate(el => getComputedStyle(el).borderRadius), '0px');
    await page.screenshot({ path: resolve(output, 'drawer.png') });
    await page.getByTestId('reference-drawer-close').click();
    await page.waitForFunction(() => document.querySelector('[data-testid="gallery-drawer"]')?.getAnimations().some(animation => animation.effect?.getTiming().duration === 250));
    const leaving = await drawer.evaluate(el => ({ text: el.textContent, animations: el.getAnimations().map(animation => ({ duration: animation.effect?.getTiming().duration, frames: (animation.effect as KeyframeEffect).getKeyframes() })) }));
    assert(leaving.text?.includes('Aminata'), 'Closing must retain the message content through the exit');
    assert(leaving.animations.some(animation => animation.duration === 250 && animation.frames.some(frame => String(frame.transform).includes('translate'))), `Unmounted drawers must finish their slide-out transition: ${JSON.stringify(leaving.animations)}`);
    await drawer.waitFor({ state: 'hidden' });
    assert(await section.getByRole('button', { name: 'Aminata Mariam Koné-Diabaté', exact: true }).evaluate(el => el === document.activeElement));

    for (const width of [390, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await section.getByRole('button', { name: 'Aminata Mariam Koné-Diabaté', exact: true }).click();
      await drawer.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const bounds = (await drawer.boundingBox())!;
      assert.equal(Math.round(bounds.width), width >= 1024 ? width / 2 : width);
      assert.equal(Math.round(bounds.y), 0);
      assert.equal(Math.round(bounds.height), 900);
      await drawer.press('Escape');
      await drawer.waitFor({ state: 'hidden' });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await section.getByRole('button', { name: 'Aminata Mariam Koné-Diabaté', exact: true }).click();
    assert(await drawer.evaluate(el => el.getAnimations().every(animation => Number(animation.effect?.getTiming().duration) < 1)), 'Reduced motion must not run the drawer slide');
    await drawer.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1280, height: 900 });
    if (process.argv.includes('--drawer-only')) {
      console.log('Shared drawers passed: entry/exit motion, retained exit content, focus restoration, responsive widths and reduced motion.');
      return;
    }

    // Native form validation, dirty tracking, keyboard selection and reset all use production primitives.
    await page.getByTestId('reference-keyboard-open').click();
    const form = page.getByTestId('form-modal');
    const name = page.getByTestId('reference-keyboard-name');
    await name.waitFor();
    assert(await name.evaluate(el => el === document.activeElement));
    await form.getByRole('button', { name: 'Save locally', exact: true }).click();
    const picker = page.getByTestId('reference-keyboard-picker');
    assert(await picker.evaluate(el => el === document.activeElement));
    await chooseOption(picker, '6e A');
    assert(await form.isVisible());
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    const discard = page.getByTestId('confirm-modal');
    await discard.waitFor();
    await discard.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await discard.waitFor({ state: 'hidden' });
    await form.getByRole('button', { name: 'Reset', exact: true }).click();
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await form.waitFor({ state: 'hidden' });
    assert.equal(await discard.count(), 0, 'Reset must restore clean baseline');
    await page.getByTestId('reference-keyboard-open').click();
    await chooseOption(picker, '6e A');
    await page.getByTestId('reference-keyboard-multiline').fill('First');
    await page.getByTestId('reference-keyboard-multiline').press('Enter');
    assert(await form.isVisible(), 'Multiline Enter must not submit');
    await name.press('Enter');
    await form.waitFor({ state: 'hidden' });
    await page.getByTestId('reference-keyboard-result').waitFor();
    await page.getByTestId('reference-destructive-open').click();
    assert(await page.getByTestId('confirm-cancel').evaluate(el => el === document.activeElement));
    await page.getByTestId('reference-confirm-reason').fill('Fixture only');
    await page.getByTestId('reference-confirm-reason').press('Enter');
    assert(await discard.isVisible(), 'Enter in text must not confirm destruction');
    await page.getByTestId('confirm-cancel').click();
    await discard.waitFor({ state: 'hidden' });
    await page.getByRole('checkbox', { name: 'Simulate a failed confirmation', exact: true }).check();
    await page.getByTestId('reference-confirm-delete-open').click();
    await page.getByTestId('confirm-submit').click();
    assert(await page.getByTestId('confirm-cancel').isDisabled());
    await page.getByRole('alert').waitFor();
    assert(await discard.isVisible());
    await page.screenshot({ path: resolve(output, 'confirmation-failure.png') });
    await page.getByTestId('confirm-cancel').click();
    assert.deepEqual(errors, []);
    writeFileSync(resolve(output, 'capture-conditions.json'), JSON.stringify({ tokenVersion: JSON.parse(readFileSync(resolve(root, '../../design-system/tokens.json'), 'utf8')).version, locales: ['en', 'fr'], viewportWidths: [360, 768, 1024, 1280], viewportHeight: 900, textScales: [1, 2], source: 'execution.json', data: 'local design fixtures', checks: ['text reflow', 'fixed gutters', 'table geometry', 'selection and customization', 'drawer motion and focus', 'form validation and dirty dismissal', 'confirmation pending and failure'] }, null, 2));
    writeFileSync(resolve(output, 'geometry.json'), JSON.stringify(measurements, null, 2));
    console.log('Shared design passed: FR/EN 16 geometry cases, selection/customization, drawer focus, required/dirty/reset/Enter and pending/failure confirmations.');
  } catch (error) {
    await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
    writeFileSync(resolve(output, 'failure.txt'), await page.locator('body').innerText());
    throw error;
  } finally { await browser.close(); await server.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
