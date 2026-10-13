import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers'

async function main() {
  ensurePlaywrightChromium()
  const appRoot = new URL('../..', import.meta.url).pathname
  const fixture = `${appRoot}/tests/fixtures/grading-config`
  const server = await createServer({
    configFile: false,
    root: appRoot,
    // The full runner also serves the demo app from this root. Keep its
    // dependency cache separate and avoid a reload during fixture interaction.
    cacheDir: 'node_modules/.vite-grading-config',
    optimizeDeps: {
      entries: [`${fixture}/Harness.svelte`],
      include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'],
    },
    plugins: [{
      name: 'grading-config-fixture',
      enforce: 'pre',
      resolveId(source) {
        if (source.includes('grade-scales-page.svelte') || source.includes('grade-levels-page.svelte'))
          return `${fixture}/action-state.svelte.ts`
        if (source === '$app/environment')
          return '\0fixture-environment'
        if (source === 'virtual:grading-entry')
          return '\0fixture-entry'
      },
      load(id) {
        if (id === '\0fixture-environment')
          return 'export const browser = true;'
        if (id === '\0fixture-entry')
          return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/grading-config/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`
      },
      configureServer(vite) {
        vite.middlewares.use('/grading-fixture', (_request, response) => {
          response.setHeader('Content-Type', 'text/html')
          response.end('<!doctype html><html><body><div id="app"></div><script type="module" src="/@id/virtual:grading-entry"></script></body></html>')
        })
      },
    }, svelte({ configFile: false })],
    resolve: { alias: [{ find: '$lib/academic/context.svelte', replacement: `${fixture}/academic-context.svelte.ts` }, { find: '$lib', replacement: `${appRoot}/src/lib` }] },
    server: { host: '127.0.0.1', port: 5198, strictPort: true, fs: { allow: [appRoot, `${appRoot}/../..`] } },
  })
  let browser
  try {
    await server.listen()
    const address = server.httpServer!.address()
    assert(address && typeof address !== 'string')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.addInitScript(() => localStorage.setItem('lang', 'en'))
    page.setDefaultTimeout(15_000)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.error(error.stack)
    })
    await page.goto(`http://127.0.0.1:${address.port}/grading-fixture`)

    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    assert.equal(await dialog.locator('fieldset').count(), 3)
    const maximum = dialog.getByLabel('Maximum', { exact: true })
    const precision = dialog.getByLabel('Decimal places', { exact: true })
    const lastUpper = dialog.locator('fieldset').last().getByLabel('Upper bound', { exact: true })
    await maximum.fill('4.35')
    await lastUpper.fill('4.35')
    await precision.fill('1')
    await dialog.getByText('Choose a precision that can represent both scale bounds exactly.').waitFor()
    assert(await page.getByTestId('form-modal-submit').isDisabled())
    await precision.fill('2')
    assert(await page.getByTestId('form-modal-submit').isEnabled())
    await maximum.fill('4')
    await lastUpper.fill('4')
    const sample = dialog.locator('input[type="number"]').last()
    await sample.fill('3.495')
    await page.getByText('A · Excellent', { exact: true }).waitFor()
    const original = await dialog.locator('fieldset').first().getByRole('textbox').first().inputValue()
    await dialog.locator('fieldset').first().getByRole('button').first().click()
    assert.equal(await dialog.locator('fieldset').count(), 4)
    assert.equal(await dialog.locator('fieldset').first().getByRole('textbox').first().inputValue(), original)
    await page.getByTestId('form-modal-submit').click()
    await dialog.waitFor({ state: 'hidden' })
    const saved = JSON.parse(await page.getByTestId('requests').innerText())
    assert.equal(saved[0].ranges[0].id, 'f')
    assert.equal(saved[0].ranges[2].id, 'b')
    await page.getByTestId('policy').click()
    await dialog.waitFor()
    await dialog.getByRole('combobox').nth(1).selectOption('mention-first')
    await page.getByTestId('form-modal-submit').click()
    await dialog.getByRole('alert').waitFor()
    assert.equal(await dialog.getByRole('alert').count(), 1)
    assert.equal(JSON.parse(await page.getByTestId('requests').innerText()).length, 1)
    await page.getByTestId('form-modal-submit').click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(JSON.parse(await page.getByTestId('requests').innerText())[1].confirmed, true)
    const output = join(appRoot, '../../.ci-evidence/grading-config')
    mkdirSync(output, { recursive: true })
    for (const locale of ['en', 'fr']) {
      await page.getByTestId(locale).click()
      for (const [width, height, zoom] of [[1280, 650, 1], [390, 844, 1], [1280, 800, 2]]) {
        await page.setViewportSize({ width, height })
        await page.evaluate(value => document.documentElement.style.fontSize = `${16 * value}px`, zoom)
        await page.getByTestId('scale').click()
        await dialog.waitFor()
        const bounds = await dialog.boundingBox()
        assert(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1, 'Dialog must fit the viewport')
        assert(await page.getByTestId('form-modal-cancel').isVisible())
        assert(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'No horizontal clipping')
        await page.screenshot({ path: join(output, `${locale}-${width}-${zoom}.png`) })
        await dialog.locator('fieldset').last().scrollIntoViewIfNeeded()
        for (const field of await dialog.locator('fieldset').all())
          assert(await field.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'Interval fields must fit without horizontal clipping')
        await page.screenshot({ path: join(output, `${locale}-${width}-${zoom}-intervals.png`) })
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'hidden' })
      }
    }
    assert.deepEqual(pageErrors, [])
    console.log('Grading forms: interval editing, lookup, one confirmation, keyboard close, French/English, mobile and 200% text checks passed.')
  }
  finally { await browser?.close(); await server.close() }
}
await main()
