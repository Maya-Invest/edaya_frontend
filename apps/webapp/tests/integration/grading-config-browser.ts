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
        if (source.includes('grade-scales-page.svelte') || source.includes('grade-levels-page.svelte') || source.includes('school-page.svelte') || source.includes('report-cards-page.svelte'))
          return `${fixture}/action-state.svelte.ts`
        if (source === '$app/stores' || source === '$lib/navigation/route-surface-navigation' || source === '$lib/navigation/app-navigation')
          return `${fixture}/navigation.ts`
        if (source === '$lib/permissions') return `${fixture}/permissions.svelte.ts`
        if (source === '$lib/api/school-data' || source === '$lib/api/private-image') return '\0fixture-assets'
        if (source === '$app/environment')
          return '\0fixture-environment'
        if (source === 'virtual:grading-entry')
          return '\0fixture-entry'
      },
      load(id) {
        if (id === '\0fixture-assets') return 'export const privateAttachmentContentPath = id => id; export const loadPrivateImage = async () => ({url: null, dispose(){}});'
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
    await page.addInitScript(() => localStorage.setItem('lang', 'en'))
    page.setDefaultTimeout(15_000)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
      console.error(error.stack)
    })
    await page.goto(server.url)

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
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
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
    assert.equal(await dialog.getByRole('textbox').count(), 2)
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
    await page.getByRole('button', { name: 'Edit', exact: true }).last().click()
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
    // Four isolated school editors; no type selector or page-wide editor.
    await page.getByTestId('school').click()
    assert.equal(await page.locator('main').getByRole('button', { name: 'Edit', exact: true }).count(), 4)
    await page.locator('main section').nth(0).getByRole('button', { name: 'Edit', exact: true }).click()
    await readyDialog()
    assert.equal(await dialog.getByRole('textbox').count(), 2)
    await dialog.getByLabel('Short name', { exact: true }).fill('')
    await checkDisabled()
    await dialog.getByLabel('Short name', { exact: true }).fill('Saved short name')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(Object.keys((await saved()).at(-1)).sort(), ['name', 'shortName', 'successMessage'])
    await page.locator('main section').nth(2).getByRole('button', { name: 'Edit', exact: true }).click()
    await readyDialog()
    await dialog.getByLabel('City', { exact: true }).fill('Montreal')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.deepEqual(Object.keys((await saved()).at(-1)).sort(), ['city', 'country', 'financeCurrency', 'successMessage', 'timeZone'])
    await page.locator('main section').nth(3).getByRole('button', { name: 'Edit', exact: true }).click()
    await dialog.getByText(/saved immediately/).waitFor()
    assert.equal(await dialog.getByRole('checkbox').count(), 2)
    await dialog.getByRole('button', { name: 'Done', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    // Templates are embedded in level Details and creation captures its scope.
    await page.getByTestId('templates').click()
    await page.getByRole('heading', { name: 'Report card templates', exact: true }).waitFor()
    assert.equal(await page.locator('main a').count(), 2)
    assert.equal(await page.getByText('Other level template', { exact: true }).count(), 0)
    assert.equal(await page.getByText('Previous year template', { exact: true }).count(), 0)
    await page.getByTestId('other-template-level').click()
    await page.getByText('Other level template', { exact: true }).waitFor()
    assert.equal(await page.locator('main a').count(), 1)
    await page.getByTestId('empty-template-year').click()
    assert.equal(await page.locator('main a').count(), 0)
    await page.getByTestId('templates').click()
    await page.getByRole('button', { name: 'Add model', exact: true }).click()
    await readyDialog()
    assert.equal(await dialog.getByRole('combobox').count(), 0)
    await dialog.getByText('2026–2027', { exact: true }).waitFor()
    await dialog.getByRole('textbox').first().fill('Created in level details')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).gradeLevelId, 'level')
    assert.equal((await saved()).at(-1).academicYearId, 'year')
    assert.equal((await saved()).at(-1).passThreshold, null)
    await page.getByTestId('templates').click()
    await page.getByTestId('permissions').click()
    assert.equal(await page.getByRole('button', { name: 'Add model', exact: true }).count(), 0)
    await page.getByTestId('permissions').click()
    // Published model edits preserve identity and scope; section edits retain weights.
    await page.getByTestId('model').click()
    await page.locator('header').getByRole('button', { name: 'Edit', exact: true }).click()
    await readyDialog()
    assert.equal(await dialog.getByRole('combobox').count(), 0)
    await dialog.getByRole('textbox').first().fill('Revised model')
    const thresholdInput = dialog.getByLabel('Passing threshold (optional)', { exact: true })
    assert.equal(await thresholdInput.inputValue(), '')
    await thresholdInput.fill('4.01')
    await checkDisabled()
    await thresholdInput.fill('2.25')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).expectedRevision, 5)
    assert.equal((await saved()).at(-1).metadata.passThreshold, 2.25)
    assert.deepEqual(Object.keys((await saved()).at(-1).metadata).sort(), ['description', 'name', 'passThreshold'])
    await page.locator('header').getByRole('button', { name: 'Edit', exact: true }).click()
    await readyDialog()
    await dialog.getByLabel('Passing threshold (optional)', { exact: true }).fill('2.25')
    await dialog.getByLabel('Passing threshold (optional)', { exact: true }).fill('')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal((await saved()).at(-1).metadata.passThreshold, null)
    await page.getByRole('button', { name: /Row actions.*Mathematics/ }).click()
    await page.getByRole('button', { name: 'Edit', exact: true }).last().click()
    await readyDialog()
    await dialog.getByRole('textbox').first().fill('Applied mathematics')
    await submit.click()
    await dialog.waitFor({ state: 'hidden' })
    const editedSection = (await saved()).at(-1).section
    assert.equal(editedSection.id, 'math')
    assert.equal(editedSection.weight, 1.5)
    assert.equal(editedSection.coefficient, 2.5)
    assert.equal(editedSection.parentSectionId, 'root')
    await page.getByTestId('policy').click()
    await readyDialog()
    assert.equal(await dialog.getByRole('combobox').first().locator('option[value="empty"]').count(), 0)
    await dialog.getByRole('combobox').nth(1).selectOption('mention-first')
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
    await dialog.getByRole('textbox', { name: 'Grade level name', exact: true }).fill('New programme')
    await dialog.getByRole('combobox', { name: 'Grading scale', exact: true }).selectOption('points')
    const createStart = (await saved()).length
    await submit.click()
    assert.equal((await saved()).length, createStart)
    await submit.click()
    await dialog.getByRole('status').filter({ hasText: 'Level details are saved' }).waitFor()
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
        for (const surface of ['scales', 'school', 'model', 'templates']) {
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
            await page.getByRole('button', { name: edit, exact: true }).last().click()
          } else if (surface === 'school') {
            await page.locator('main section').nth(1).getByRole('button', { name: edit, exact: true }).click()
          } else if (surface === 'templates') {
            await page.getByRole('button', { name: locale === 'en' ? 'Add model' : 'Ajouter un modèle', exact: true }).click()
          } else {
            await page.locator('header').getByRole('button', { name: edit, exact: true }).click()
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
    console.log('Configuration: isolated school editors, thresholds, published model edits, permissions, retained drafts, French/English, keyboard, mobile and 200% text checks passed.')
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
