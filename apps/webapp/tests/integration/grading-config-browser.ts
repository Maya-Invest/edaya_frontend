import { chooseOption, selectControl, selectOptions } from './support/custom-select';
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { chromium, type Page } from 'playwright'
import { createFixtureServer } from './support/fixture-server'
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers'

async function main() {
  ensurePlaywrightChromium()
  const appRoot = new URL('../..', import.meta.url).pathname
  const fixture = `${appRoot}/tests/fixtures/grading-config`
  process.chdir(appRoot)
  const server = await createFixtureServer({
    configFile: false,
    root: appRoot,
    publicDir: 'static',
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
        if (source.includes('grade-scales-page.svelte') || source.includes('grade-levels-page.svelte') || source.includes('school-page.svelte') || source.includes('subjects-page.svelte'))
          return `${fixture}/action-state.svelte.ts`
        if (source === '$app/stores' || source === '$lib/navigation/route-surface-navigation' || source === '$lib/navigation/app-navigation')
          return `${fixture}/navigation.ts`
        if (source === '$lib/permissions') return `${fixture}/permissions.svelte.ts`
        if (source === '$lib/api/school-data' || source === '$lib/api/private-image') return '\0fixture-assets'
        if (source === '$env/static/public') return '\0fixture-public-env'
        if (source === '$app/environment')
          return '\0fixture-environment'
        if (source === 'virtual:grading-entry')
          return '\0fixture-entry'
      },
      load(id) {
        if (id === '\0fixture-assets') return 'export const privateAttachmentContentPath = id => id; export const loadPrivateImage = async () => ({url: null, dispose(){}});'
        if (id === '\0fixture-public-env') return 'export const PUBLIC_API_URL = "http://127.0.0.1:1"; export const PUBLIC_IDENTITY_URL = "http://127.0.0.1:1";'
        if (id === '\0fixture-environment')
          return 'export const browser = true;'
        if (id === '\0fixture-entry')
          return `import('/src/app.css'); Promise.all([import('svelte'), import('/tests/fixtures/grading-config/Harness.svelte')]).then(([svelte, {default: Harness}]) => { svelte.mount(Harness,{target:document.getElementById('app')}); }).catch(error => console.error('BOOT',error.stack));`
      },
      configureServer(vite) {
        vite.middlewares.use('/grading-fixture', (_request, response) => {
          response.setHeader('Content-Type', 'text/html')
          response.end('<!doctype html><html><body><div id="app"></div><script type="module" src="/@id/virtual:grading-entry"></script></body></html>')
        })
      },
    }, svelte({ configFile: false })],
    resolve: { alias: [
      { find: '$lib/navigation/route-surface-navigation', replacement: `${fixture}/navigation.ts` },
      { find: '$lib/navigation/app-navigation', replacement: `${fixture}/navigation.ts` },
      { find: '$lib/permissions', replacement: `${fixture}/permissions.svelte.ts` },
      { find: '$lib/api/school-data', replacement: `${fixture}/assets.ts` },
      { find: '$lib/api/private-image', replacement: `${fixture}/assets.ts` },
{ find: '$lib/academic/context.svelte', replacement: `${fixture}/academic-context.svelte.ts` }, { find: '$lib', replacement: `${appRoot}/src/lib` }] },
    server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
  }, 'grading-config', Number(process.env.EDAYA_GRADING_FIXTURE_PORT ?? 14178), '/grading-fixture')
  let browser
  let failurePage: Page | undefined
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    failurePage = page
    page.on('console', message => { console.log('BROWSER', message.type(), message.text()) })
    page.on('requestfailed', request => console.error('Fixture request failed', request.url(), request.failure()))
    await page.addInitScript(() => localStorage.setItem('lang', 'en'))
    page.setDefaultTimeout(45_000)
    page.on('response', response => { if (response.status() >= 400) console.error('HTTP', response.status(), response.url()) })
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.error(error.stack)
    })
    await page.goto(server.url, { waitUntil: 'domcontentloaded' })

    const dialog = page.getByRole('dialog')
    const readyDialog = async () => {
      await dialog.waitFor()
      // Bits UI schedules initial focus on the next animation frame. Filling
      // before that can send the next field's text to the first input instead.
      await page.waitForFunction(() => {
        const firstInput = document.querySelector('[role="dialog"] input:not(:disabled)')
        return firstInput && document.activeElement === firstInput
      })
    }
    const submit = page.getByTestId('form-modal-submit')
    const checkDisabled = async () => {
      await submit.waitFor()
      try {
        await page.waitForFunction(() => (document.querySelector('[data-testid="form-modal-submit"]') as HTMLButtonElement)?.disabled)
      } catch (error) {
        console.error(await dialog.evaluate(element => ({ fields: Array.from(element.querySelectorAll('input')).map(input => ({ value: input.value, required: input.required })), buttons: Array.from(element.querySelectorAll('button')).map(button => ({ text: button.textContent, disabled: button.disabled })) })))
        throw error
      }
      assert(await submit.isDisabled())
    }
    const saved = async () => JSON.parse(await page.getByTestId('requests').innerText())
    const close = async () => { await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' }) }
    const openScale = async () => {
      await page.getByTestId('scales').click()
      await page.locator('main section').first().getByRole('button', { name: 'Row actions' }).first().click()
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
      await readyDialog()
    }
    await page.getByText('Detailed point scale', { exact: true }).waitFor()
    assert.equal(await page.getByRole('searchbox').count(), 1)
    assert.equal(await page.getByRole('button', { name: 'Use continuous intervals', exact: true }).count(), 0)
    assert.equal(await page.locator('main li').getByRole('button', { name: /^Edit / }).count(), 0)
    const sample = page.getByLabel('Test a value')
    await sample.fill('3.495')
    await page.getByText('A · Excellent', { exact: true }).last().waitFor()
    await sample.fill('4.001')
    await page.getByText('No matching interval', { exact: true }).waitFor()
    await openScale()
    for (const name of ['Name', 'Description', 'Short name']) await dialog.getByRole('textbox', { name, exact: true }).waitFor()
    assert.equal(await dialog.getByRole('textbox').count(), 3)
    assert.equal(await dialog.getByLabel('Upper bound', { exact: true }).count(), 0)
    await dialog.getByLabel('Maximum', { exact: true }).fill('4.35')
    await dialog.getByLabel('Decimal places', { exact: true }).fill('1')
    await checkDisabled()
    await dialog.getByLabel('Decimal places', { exact: true }).fill('2')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved())[0].action, 'metadata')
    assert.equal((await saved())[0].expectedRevision, 1)
    assert(!('ranges' in (await saved())[0].metadata))
    // Each interval is independently edited with stable identity and a minimum only.
    await page.getByRole('button', { name: 'Add interval', exact: true }).click()
    await readyDialog()
    await dialog.getByLabel('Code', { exact: true }).fill('B')
    await dialog.getByLabel('Mention label', { exact: true }).fill('New interval')
    assert.equal(await dialog.getByLabel('Mention label', { exact: true }).inputValue(), 'New interval')
    await dialog.getByLabel('Minimum value', { exact: true }).fill('3')
    await checkDisabled()
    await dialog.getByLabel('Code', { exact: true }).fill('B+')
    await dialog.getByLabel('Assigned points', { exact: true }).fill('3.25')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved())[1].interval.minScore, 3)
    assert(!('maxScore' in (await saved())[1].interval))
    assert(!('isPassing' in (await saved())[1].interval))
    const firstRow = page.locator('main section').first().locator('li').first()
    await firstRow.getByRole('button', { name: 'Row actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).last().click()
    await readyDialog()
    assert(await dialog.getByLabel('Minimum value', { exact: true }).isDisabled())
    await dialog.getByLabel('Mention label', { exact: true }).fill('Still failing')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved())[2].interval.id, 'f')
    await page.getByRole('button', { name: /New empty scale/ }).click()
    await page.getByRole('button', { name: 'Add interval', exact: true }).click()
    assert.equal(await dialog.getByLabel('Minimum value', { exact: true }).inputValue(), '0')
    assert(await dialog.getByLabel('Minimum value', { exact: true }).isDisabled())
    await close()
    // Five isolated school editors, including scheduling settings.
    await page.getByTestId('school').click()
    assert.equal(await page.locator('main').getByRole('button', { name: 'Edit', exact: true }).count(), 5)
    await page.locator('main section').filter({ has: page.getByRole('heading', { name: 'Identity', exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).click()
    await readyDialog()
    assert.equal(await dialog.getByRole('textbox').count(), 2)
    await dialog.getByLabel('Short name', { exact: true }).fill('')
    await checkDisabled()
    await dialog.getByLabel('Short name', { exact: true }).fill('Saved short name')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(Object.keys((await saved()).at(-1)).sort(), ['name', 'shortName', 'successMessage'])
    await page.locator('main section').filter({ has: page.getByRole('heading', { name: 'Location', exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).click()
    await readyDialog()
    await dialog.getByLabel('City', { exact: true }).fill('Montreal')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(Object.keys((await saved()).at(-1)).sort(), ['city', 'country', 'financeCurrency', 'successMessage', 'timeZone'])
    await page.locator('main section').filter({ has: page.getByRole('heading', { name: 'Official document assets', exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).click()
    await dialog.getByText(/saved immediately/).waitFor()
    assert.equal(await dialog.getByRole('checkbox').count(), 2)
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    // Modules share the Subjects collection and capture the configuration revision.
    await page.getByTestId('modules').click()
    await page.getByRole('heading', { name: 'Sciences', exact: true }).waitFor()
    await page.getByRole('heading', { name: 'Ungrouped subjects', exact: true }).waitFor()
    await page.getByRole('searchbox').fill('Mathematics')
    await page.getByText('Sum of subject coefficients: 5', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Row actions · Sciences', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
    await readyDialog()
    await dialog.getByRole('textbox').first().fill('Natural sciences')
    await selectControl(dialog).first().click()
    await page.getByRole('option', { name: 'Explicit weight', exact: true }).click()
    await dialog.getByRole('spinbutton').last().fill('0')
    await checkDisabled()
    await dialog.getByRole('spinbutton').last().fill('2')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).expectedRevision, 5)
    assert.equal((await saved()).at(-1).module.weightingMode, 'explicit')
    assert.equal((await saved()).at(-1).module.explicitWeight, 2)
    await page.getByRole('searchbox').fill('')
    await page.getByRole('button', { name: 'Row actions · Sciences', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Manage subjects', exact: true }).click()
    await dialog.waitFor()
    await dialog.getByRole('checkbox', { name: 'Physics', exact: true }).uncheck()
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual((await saved()).at(-1).assignments, [{ subjectId: 'math', moduleId: 'sciences' }, { subjectId: 'physics', moduleId: null }])
    await page.getByRole('button', { name: 'Row actions · Sciences', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete module', exact: true }).click()
    await dialog.getByRole('button', { name: 'Delete module', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).action, 'delete')
    assert.equal((await saved()).at(-1).moduleId, 'sciences')
    await page.getByTestId('collection-menu').click()
    await page.getByRole('menuitem', { name: 'Report settings', exact: true }).click()
    await readyDialog()
    await dialog.getByRole('spinbutton').fill('2.5')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).passThreshold, 2.5)
    assert.equal((await saved()).at(-1).expectedRevision, 5)
    await page.getByTestId('policy').click()
    await readyDialog()
    assert.equal(await selectOptions(selectControl(dialog).first()).and(dialog.locator('option[value="empty"]')).count(), 0)
    await chooseOption(selectControl(dialog).nth(1), 'mention-first')
    const before = (await saved()).length
    await submit.click()
    assert.equal(await dialog.getByRole('alert').count(), 1)
    assert.equal((await saved()).length, before)
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).confirmed, true)
    // The level editor saves metadata and grading from one form.
    await page.getByTestId('policy').click()
    await readyDialog()
    await dialog.getByRole('textbox', { name: 'Grade level name', exact: true }).fill('Updated programme')
    await dialog.getByRole('textbox', { name: 'Aggregate label', exact: true }).fill('Overall average')
    const combinedStart = (await saved()).length
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    const combined = (await saved()).slice(combinedStart)
    assert.equal(combined.length, 2)
    assert.equal(combined[0].id, combined[1].gradeLevelId)
    assert.equal(combined[1].aggregateLabel, 'Overall average')
    // A partial creation retains its id and retries only the grading update.
    await page.getByTestId('grading-failure').click()
    await page.getByTestId('create-level').click()
    await readyDialog()
    assert.equal(await page.getByTestId('level-dirty').innerText(), 'false')
    await dialog.getByRole('textbox', { name: 'Grade level name', exact: true }).fill('New programme')
    await page.getByTestId('level-dirty').filter({ hasText: 'true' }).waitFor()
    await chooseOption(selectControl(dialog, { name: 'Grading scale', exact: true }), 'points')
    const createStart = (await saved()).length
    await submit.click()
    assert.equal((await saved()).length, createStart)
    await submit.click()
    await dialog.getByRole('status').filter({ hasText: 'Level details are saved' }).waitFor()
    assert.equal(await page.getByTestId('level-dirty').innerText(), 'true')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    const created = (await saved()).slice(createStart)
    assert.equal(created.length, 3)
    assert.equal(created[0].id, created[1].gradeLevelId)
    assert.equal(created[0].id, created[2].gradeLevelId)
    assert.equal(created[2].confirmed, true)
    // Denied controls and failed saves do not discard the draft.
    await openScale()
    await dialog.getByRole('textbox').first().fill('Unsaved draft')
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-testid="failure"]')!.click())
    await submit.click()
    assert.equal(await dialog.getByRole('textbox').first().inputValue(), 'Unsaved draft')
    await page.evaluate(() => document.querySelector<HTMLButtonElement>('[data-testid="permissions"]')!.click())
    await checkDisabled()
    await close()
    assert.equal(await page.getByRole('button', { name: 'Add interval', exact: true }).count(), 0)
    assert.equal(await page.locator('main li').getByRole('button', { name: /^Edit / }).count(), 0)
    await page.getByTestId('permissions').click()
    await page.getByTestId('failure').click()
    const output = process.env.INTEGRATION_ARTIFACT_DIR ?? join(appRoot, '../../.ci-evidence/grading-config')
    mkdirSync(output, { recursive: true })
    for (const locale of ['en', 'fr']) {
      await page.getByTestId(locale).click()
      for (const [width, height, zoom] of [[1280, 650, 1], [390, 844, 1], [1280, 800, 2]]) {
        await page.setViewportSize({ width, height })
        await page.evaluate(value => document.documentElement.style.fontSize = `${16 * value}px`, zoom)
        for (const surface of ['scales', 'school', 'modules']) {
          console.log(`Checking ${surface}: ${locale}, ${width}px, ${zoom}x text`)
          await page.getByTestId(surface).click()
          if (surface === 'scales') {
            const valueInput = page.getByLabel(locale === 'en' ? 'Test a value' : 'Tester une valeur')
            await valueInput.fill('3.495')
            const result = page.locator('main section').first().getByRole('status')
            assert.equal(await result.innerText(), 'A · Excellent')
            if (width >= 1024) {
              const inputBox = await valueInput.boundingBox()
              const resultBox = await result.boundingBox()
              assert(inputBox && resultBox && resultBox.x >= inputBox.x + inputBox.width, 'Sample mention must sit beside its input')
              assert(resultBox.y < inputBox.y + inputBox.height && resultBox.y + resultBox.height > inputBox.y, 'Sample mention must share the input line')
            }
          }
          assert(await page.locator('main').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${surface} must fit viewport`)
          const edit = locale === 'en' ? 'Edit' : 'Modifier'
          if (surface === 'scales') {
            await page.locator('main li').first().getByRole('button', { name: locale === 'en' ? 'Row actions' : 'Actions de ligne', exact: true }).click()
            await page.getByRole('menuitem', { name: edit, exact: true }).last().click()
          } else if (surface === 'school') {
            await page.locator('main section').nth(1).getByRole('button', { name: edit, exact: true }).click()
          } else {
            await page.getByRole('button', { name: /Sciences/ }).click()
            await page.getByRole('menuitem', { name: edit, exact: true }).click()
          }
          await dialog.waitFor()
          const bounds = await dialog.boundingBox()
          assert(bounds && bounds.x >= -1 && bounds.x + bounds.width <= width + 1, 'Dialog must fit the viewport')
          assert(await page.getByTestId('form-modal-cancel').isVisible())
          assert(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), 'No horizontal clipping')
          await page.keyboard.press('Tab')
          assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Keyboard focus remains inside dialog')
          await page.screenshot({ path: join(output, `${locale}-${width}-${zoom}-${surface}-editor.png`), animations: 'disabled' })
          await close()
          await page.screenshot({ path: join(output, `${locale}-${width}-${zoom}-${surface}.png`), fullPage: true, animations: 'disabled' })
        }
      }
    }
    assert.deepEqual(pageErrors, [])
    console.log('Configuration: isolated school editors, thresholds, module weighting edits, permissions, retained drafts, French/English, keyboard, mobile and 200% text checks passed.')
  }
  catch (error) {
    if (failurePage) {
      console.error('Grading failure state:', await failurePage.locator('body').evaluate(element => ({
        text: element.textContent,
        fields: Array.from(element.querySelectorAll('input')).map(input => ({ label: input.closest('label')?.textContent, value: input.value, disabled: input.disabled })),
      })))
    }
    throw error
  }
  finally { try { await browser?.close() } finally { await server.close() } }
}
await main()
