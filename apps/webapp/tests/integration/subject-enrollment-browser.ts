import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright';
import { createFixtureServer } from './support/fixture-server';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

async function main() {
	ensurePlaywrightChromium();
	const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? '/private/tmp/edaya-subject-enrollment-evidence';
	mkdirSync(artifacts, { recursive: true });
	const appRoot = new URL('../..', import.meta.url).pathname;
	const fixture = `${appRoot}/tests/fixtures/subject-enrollment`;
	const mocks = ['$app/stores', '$app/navigation', '$lib/academic/context.svelte', '$lib/auth/session.svelte', '$lib/permissions', '$lib/api/school-client', '$lib/entity-versions.svelte', '$lib/toast.svelte', '$lib/navigation/app-navigation'];
	const server = await createFixtureServer({ configFile: false, root: appRoot, cacheDir: 'node_modules/.vite-subject-enrollment',
		optimizeDeps: { entries: [`${fixture}/Harness.svelte`], include: ['@maya-invest/edaya-api-client', 'bits-ui', 'lucide-svelte', 'tailwind-merge'] },
		plugins: [{ name: 'subject-enrollment-fixture', enforce: 'pre',
			resolveId(source) {
				if (mocks.includes(source) || source === './app-navigation' || source === './student-enrollments-tab.svelte' || source === '../students-page.svelte' || source === '../class-students-page.svelte') return `${fixture}/environment.svelte.ts`;
				if (source === '$app/environment') return '\0fixture-environment';
				if (source === '$env/static/public') return '\0fixture-public';
				if (source === 'virtual:subject-enrollment-entry') return '\0fixture-entry';
			},
			load(id) {
				if (id === '\0fixture-environment') return 'export const browser = true; export const dev = true;';
				if (id === '\0fixture-public') return 'export const PUBLIC_API_URL = \"http://127.0.0.1:14239\"; export const PUBLIC_APP_ENV = \"test\";';
				if (id === '\0fixture-entry') return `import '/src/app.css'; import {mount} from 'svelte'; import Harness from '/tests/fixtures/subject-enrollment/Harness.svelte'; mount(Harness,{target:document.getElementById('app')});`;
			},
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (!request.url?.startsWith('/school/') && !request.url?.startsWith('/classes/')) return next();
					response.setHeader('Content-Type', 'text/html');
					response.end('<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><body><div id="app"></div><script type="module" src="/@id/virtual:subject-enrollment-entry"></script></body></html>');
				});
			},
		}, svelte({ configFile: false })],
		resolve: { alias: [...mocks.map(find => ({ find, replacement: `${fixture}/environment.svelte.ts` })), { find: '$lib', replacement: `${appRoot}/src/lib` }] },
		server: { fs: { allow: [appRoot, `${appRoot}/../..`] } },
	}, 'subject-enrollment', 14239, '/school/students/child/enrollments');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  try {
    await page.goto(server.url);
    const music = page.locator('.ui-collection-row').filter({ hasText: 'Music' });
    const subjectName = await music.getByText('Music', { exact: true }).boundingBox();
    const scope = await music.getByText('Not enrolled', { exact: true }).boundingBox();
    assert(subjectName && scope && scope.y >= subjectName.y + subjectName.height && Math.abs(scope.x - subjectName.x) < 1);
    await page.getByTestId('fail').click();
    await page.getByRole('button', { name: 'Update optional subjects' }).click();
    await page.getByRole('dialog').waitFor();
    assert(new URL(page.url()).searchParams.get('modal') === 'subject-selection');
    await page.getByRole('checkbox', { name: 'Change enrolment for Music' }).click();
    await page.getByRole('checkbox', { name: 'Term 1' }).click();
    await page.getByTestId('form-modal-submit').click();
    assert.equal(await page.getByRole('checkbox', { name: 'Term 1' }).isChecked(), true);
    await page.screenshot({ path: resolve(artifacts, 'enrollment-desktop.png') });
    await page.getByTestId('form-modal-submit').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const requests = JSON.parse(await page.getByTestId('requests').innerText());
    assert.equal(requests.length, 2);
    assert.equal(requests[0].requestId, requests[1].requestId);
    assert.deepEqual(requests[0].operations[0].selection, { scope: 'periods', periodIds: ['term'] });
    assert.equal(requests[0].expectedRevisions.music, 3);
    await page.getByRole('button', { name: 'Update optional subjects' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('checkbox', { name: 'Change enrolment for Music' }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Term 1' }).isChecked(), true);
    const singleDialog = page.getByRole('dialog');
    assert.equal(await singleDialog.getByText('Class A · 2026–2027 · 1 selected', { exact: true }).isVisible(), true);
    assert.equal(await singleDialog.getByText('1 selected', { exact: true }).count(), 0);
    assert.equal(await singleDialog.getByText('Selected students', { exact: true }).count(), 0);
    assert.equal(await singleDialog.getByRole('button', { name: 'Clear selection' }).count(), 0);
    await singleDialog.getByRole('checkbox', { name: 'Term 1' }).click();
    assert.equal(await singleDialog.getByText(/Withdrawal takes effect immediately/).count(), 0);
    assert.equal(await singleDialog.getByRole('button', { name: 'Withdraw', exact: true }).isEnabled(), true);
    await page.getByTestId('form-modal-submit').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const withdrawal = JSON.parse(await page.getByTestId('requests').innerText()).at(-1).operations[0];
    assert.deepEqual(withdrawal.selection, { scope: 'none' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('fr').click();
    await page.getByRole('button', { name: 'Modifier les matières facultatives', exact: true }).click();
    for (const subject of ['Music', 'Art'])
      await page.getByRole('checkbox', { name: `Modifier l’inscription à ${subject}`, exact: true }).click();
    await page.getByTestId('form-modal-submit').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const multi = JSON.parse(await page.getByTestId('requests').innerText()).at(-1);
    assert.deepEqual(multi.operations.map((op: { classSubjectId: string }) => op.classSubjectId).sort(), ['art', 'music']);
    await page.screenshot({ path: resolve(artifacts, 'enrollment-mobile-fr.png') });
    await page.goto(`${server.url}?denied&modal=subject-selection&modalTarget=music`);
    await page.getByTestId('fail').waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Update optional subjects' }).count(), 0);
    const origin = new URL(server.url).origin;
    for (const path of ['/school/students', '/classes/class/students']) {
      for (const view of ['table', 'list']) {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`${origin}${path}?view=${view}`);
        await page.getByTestId('collection-menu').click();
        await page.getByRole('menuitem', { name: 'Select', exact: true }).click();
        const rows = page.getByRole('checkbox', { name: 'Select row', exact: true });
        await rows.nth(0).focus();
        await page.keyboard.press('Space');
        if (view === 'table') {
          const selectedBox = await rows.first().evaluate(element => {
            const target = getComputedStyle(element);
            const face = getComputedStyle(element, '::before');
            return { target: [target.width, target.height, target.backgroundColor], face: [face.width, face.height, face.backgroundColor] };
          });
          assert.deepEqual(selectedBox.target, ['44px', '44px', 'rgba(0, 0, 0, 0)']);
          assert.deepEqual(selectedBox.face.slice(0, 2), ['16px', '16px']);
          assert.notEqual(selectedBox.face[2], 'rgba(0, 0, 0, 0)');
        }
        await rows.nth(1).click();
        if (path === '/school/students') {
          await rows.nth(2).click();
          await page.getByRole('button', { name: 'Batch actions', exact: true }).click();
          assert.equal(await page.getByRole('button', { name: 'Subject enrolments', exact: true }).isDisabled(), true);
          assert.equal(await page.getByText('All selected students must have an active placement in the same class.').isVisible(), true);
          await page.keyboard.press('Escape');
          await rows.nth(2).click();
        }
        await page.getByRole('button', { name: 'Batch actions', exact: true }).click();
        await page.getByRole('button', { name: 'Subject enrolments', exact: true }).click();
        await page.getByRole('checkbox', { name: 'Change enrolment for Music' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Subject enrolments', exact: true }).count(), 0);
        assert.equal(await page.getByTestId('form-modal-submit').isDisabled(), true);
        await page.getByRole('checkbox', { name: 'Change enrolment for Music' }).click();
        await page.getByTestId('form-modal-cancel').click();
        await page.getByTestId('confirm-modal').waitFor();
        await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
        await page.getByTestId('form-modal-submit').click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const batch = JSON.parse(await page.getByTestId('requests').innerText());
        assert.equal(batch.length, 1);
        assert.equal(batch[0].operations.length, 2);
        assert(batch[0].operations.every((op: { classSubjectId: string; selection: { scope: string } }) => op.classSubjectId === 'music' && op.selection.scope === 'annual'));
        assert.equal(await page.getByRole('checkbox', { name: 'Select row', exact: true }).nth(0).isChecked(), true);
        // Switching the collection view keeps exactly the selected recipients.
        await page.getByTestId('collection-menu').click();
        await page.getByRole('menuitem', { name: view === 'table' ? 'List view' : 'Table view', exact: false }).click();
        assert.equal(await page.getByRole('checkbox', { name: 'Select row', exact: true }).nth(1).isChecked(), true);
        await page.getByTestId('conflict').click();
        await page.getByRole('button', { name: 'Batch actions', exact: true }).click();
        await page.getByRole('button', { name: 'Subject enrolments', exact: true }).click();
        await page.getByRole('checkbox', { name: 'Change enrolment for Music' }).click();
        const dialog = page.getByRole('dialog');
        assert.equal(await dialog.getByText(/ · 2026–2027 · 2 selected$/).isVisible(), true);
        assert.equal(await dialog.getByText('2 selected', { exact: true }).count(), 0);
        assert.equal(await dialog.getByText('Selected students', { exact: true }).count(), 0);
        assert.equal(await dialog.getByRole('button', { name: 'Clear selection', exact: true }).count(), 0);
        await dialog.getByRole('checkbox', { name: 'Full academic year', exact: true }).click();
        assert.equal(await dialog.getByText(/Withdrawal takes effect immediately/).count(), 0);
        await page.getByTestId('form-modal-submit').click();
        await page.getByText('Enrolments changed. Current selections have been refreshed; review your changes before saving again.').waitFor();
        assert.equal(await page.getByTestId('form-modal-submit').isDisabled(), false);
        await page.getByTestId('form-modal-submit').click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const withdrawals = JSON.parse(await page.getByTestId('requests').innerText());
        assert.equal(withdrawals.length, 3);
        assert.notEqual(withdrawals[1].requestId, withdrawals[2].requestId);
        assert(withdrawals[2].operations.every((op: { selection: { scope: string } }) => op.selection.scope === 'none'));
        await page.getByRole('button', { name: 'Batch actions', exact: true }).click();
        await page.getByRole('button', { name: 'Subject enrolments', exact: true }).click();
        await page.getByRole('checkbox', { name: 'Change enrolment for Art' }).click();
        await page.getByRole('checkbox', { name: 'Term 1', exact: true }).click();
        await page.screenshot({ path: resolve(artifacts, `${path.startsWith('/school') ? 'school' : 'class'}-${view}-batch.png`) });
        await page.getByTestId('form-modal-submit').click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const updated = JSON.parse(await page.getByTestId('requests').innerText());
        assert(updated[3].operations.every((op: { classSubjectId: string; selection: { scope: string } }) => op.classSubjectId === 'art' && op.selection.scope === 'periods'));
      }
    }
    await page.goto(`${origin}/school/students?modal=subject-selection&modalTarget=class`);
    await page.getByText('Select students from the same class to update their subject enrolments.', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('form-modal-submit').isDisabled(), true);
    await page.getByTestId('form-modal-cancel').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('fr').click();
    await page.getByTestId('collection-menu').click();
    await page.getByRole('menuitem', { name: 'Sélectionner', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Sélectionner la ligne', exact: true }).nth(0).click();
    await page.getByRole('checkbox', { name: 'Sélectionner la ligne', exact: true }).nth(1).click();
    await page.getByRole('button', { name: 'Actions groupées', exact: true }).click();
    await page.getByRole('button', { name: 'Inscriptions aux matières', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Modifier l’inscription à Music', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Modifier l’inscription à Art', exact: true }).click();
    const timingNote = 'L’inscription commence maintenant, ou au début d’une période future, et se termine à la fin de la durée choisie.';
    const batchDialog = page.getByRole('dialog');
    assert.equal(await batchDialog.getByText(timingNote, { exact: true }).count(), 1);
    assert.equal(await batchDialog.locator('[role="status"] ~ p').filter({ hasText: timingNote }).isVisible(), true);
    await page.screenshot({ path: resolve(artifacts, 'batch-mobile-fr.png') });
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    await page.getByTestId('form-modal-submit').scrollIntoViewIfNeeded();
    assert.equal(await page.getByTestId('form-modal-submit').isVisible(), true);
    await page.screenshot({ path: resolve(artifacts, 'batch-mobile-fr-large-text.png') });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
