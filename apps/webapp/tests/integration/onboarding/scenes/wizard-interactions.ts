import { resolveApiUrl } from '../../support/integration-hosts';
import type { OnboardingRunContext } from '../types';
import { expectOnboardingStep, signUpThroughUi, waitForEnabled } from '../support/auth';
import {
	addInvalidStaffInviteRow,
	clickContinue,
	createSchoolButton,
	expectContinueDisabled,
	fillSchoolIdentity,
	selectCollegeAndOneClass,
	skipStepButton,
} from '../support/wizard';

export async function runWizardStepInteractions(ctx: OnboardingRunContext): Promise<void> {
	const { page, base, credentials } = ctx;

	await signUpThroughUi(page, base, {
		name: credentials.name,
		email: credentials.email,
		password: credentials.password,
	});
	await expectOnboardingStep(page, 1);
	await expectContinueDisabled(page);

	await fillSchoolIdentity(page, credentials.schoolName, credentials.city);
	await page.screenshot({ path: `${ctx.outDir}/wizard-school-desktop-fr.png`, fullPage: true });
	await clickContinue(page);
	await expectOnboardingStep(page, 2);
	await expectContinueDisabled(page);

	await selectCollegeAndOneClass(page);
	await page.screenshot({ path: `${ctx.outDir}/wizard-structure-desktop-fr.png`, fullPage: true });
	await clickContinue(page);
	await expectOnboardingStep(page, 3);

	const skip = skipStepButton(page);
	await skip.waitFor({ state: 'visible', timeout: 15_000 });
	await page.screenshot({ path: `${ctx.outDir}/wizard-staff-desktop-fr.png`, fullPage: true });
	await addInvalidStaffInviteRow(page);
	await expectContinueDisabled(page);

	await waitForEnabled(skip);
	await skip.click();
	await expectOnboardingStep(page, 4);

	const createSchool = createSchoolButton(page);
	await waitForEnabled(createSchool);

	const subjectRow = page.locator('tr[role="button"]').first();
	await subjectRow.waitFor({ state: 'visible', timeout: 30_000 });
	await subjectRow.focus();
 await page.keyboard.press('Enter');
	const chaptersDrawer = page.getByTestId('onboarding-subject-drawer');
	await chaptersDrawer.waitFor({ state: 'visible', timeout: 15_000 });
	if (await chaptersDrawer.locator('input, textarea, select').count()) throw new Error('Curriculum drawer must be read-only');
	await page.screenshot({ path: `${ctx.outDir}/wizard-curriculum-drawer-desktop-fr.png`, fullPage: true });
 await page.keyboard.press('Escape');
	await chaptersDrawer.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
 await page.locator('summary').filter({hasText: 'Moyenne générale'}).first().click();
 const labels = ['Très-faible', 'Faible', 'Très-insuffisant', 'Insuffisant', 'Passable', 'Assez-Bien', 'Bien', 'Très-Bien', 'Excellent'];
 for (const label of labels) await page.getByText(label, {exact: true}).first().waitFor({state: 'visible'});
 if (await page.locator('[data-testid^="discipline-code-"]').count()) throw new Error('Obsolete mapping editor');
 await page.getByText('Excellent', { exact: true }).first().scrollIntoViewIfNeeded();
 await page.screenshot({ path: `${ctx.outDir}/wizard-review-grading-desktop-fr.png`, fullPage: true });
 await page.reload({waitUntil: 'domcontentloaded'});
 await expectOnboardingStep(page, 4);
 await waitForEnabled(createSchoolButton(page));
 await page.setViewportSize({width: 390, height: 844});
 await page.screenshot({path: `${ctx.outDir}/wizard-review-mobile-fr.png`, fullPage: true});
 await page.evaluate(() => localStorage.setItem('lang', 'en'));
 await page.reload({waitUntil: 'domcontentloaded'});
 await waitForEnabled(createSchoolButton(page));
 await page.screenshot({path: `${ctx.outDir}/wizard-review-mobile-en.png`, fullPage: true});
 if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Review overflows a narrow viewport');
 // A removed exact version must not silently switch to the available default.
 await page.evaluate(() => {
  for (const store of [sessionStorage, localStorage]) {
   for (let i = 0; i < store.length; i++) {
    const key = store.key(i)!;
    if (!key.startsWith('edaya:onboarding:draft:')) continue;
    const draft = JSON.parse(store.getItem(key)!); draft.structure.dataset.version = '0.9.0'; store.setItem(key, JSON.stringify(draft));
   }
  }
 });
 await page.reload({waitUntil: 'domcontentloaded'});
 await page.getByText(/version enregistrée du programme ne peut pas être chargée|saved curriculum version cannot be loaded/i).first().waitFor({state: 'visible', timeout: 30000});
 if (await createSchoolButton(page).isEnabled()) throw new Error('Unavailable dataset must block provisioning');
 await page.screenshot({ path: `${ctx.outDir}/wizard-unavailable-dataset-mobile-en.png`, fullPage: true });
 await page.getByRole('button', {name: /choisir le programme disponible|choose.*available/i}).click();
 await expectOnboardingStep(page, 2);
 await expectContinueDisabled(page);
 await page.screenshot({path: `${ctx.outDir}/wizard-structure-mobile-en.png`, fullPage: true});
 // Exercise the selector with two published choices while retaining the real canonical content.
 const canonical = await (await page.request.get(`${resolveApiUrl()}/core/onboarding/datasets/ci-general-secondary/1.0.0`)).json();
 await page.route(/\/core\/onboarding\/datasets(?:\?.*)?$/, async route => {
  const response = await route.fetch(); const body = await response.json();
  await route.fulfill({json: {...body, datasets: [...body.datasets, {id: 'ci-alternative', version: '1.0.0', countryCode: 'CI', label: 'Alternative curriculum', isDefault: false}]}});
 });
 await page.route('**/core/onboarding/datasets/ci-alternative/1.0.0', route => route.fulfill({json: {...canonical, id: 'ci-alternative'}}));
 await page.reload({waitUntil: 'domcontentloaded'});
 await selectCollegeAndOneClass(page);
 const schoolBefore = await page.evaluate(() => {
  const key = Object.keys(sessionStorage).find(key => key.startsWith('edaya:onboarding:draft:'))!;
  return JSON.parse(sessionStorage.getItem(key)!).school;
 });
 await page.getByRole('button', {name: 'School curriculum', exact: true}).click();
 await page.getByRole('option', {name: 'Alternative curriculum', exact: true}).click();
 await page.getByTestId('onboarding-dataset').getByText('Alternative curriculum', {exact: true}).waitFor({state: 'visible'});
 await expectContinueDisabled(page);
 const changed = await page.evaluate(() => {
  const key = Object.keys(sessionStorage).find(key => key.startsWith('edaya:onboarding:draft:'))!;
  return JSON.parse(sessionStorage.getItem(key)!);
 });
 if (JSON.stringify(changed.school) !== JSON.stringify(schoolBefore) || changed.structure.templates.length || changed.structure.levels.length || changed.structureStepSubmitted) throw new Error('Dataset selection must reset only structural configuration');
 if (changed.structure.dataset.id !== 'ci-alternative') throw new Error('Dataset reference was not pinned');

}
