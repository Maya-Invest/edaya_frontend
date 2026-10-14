import type { Page } from 'playwright';
import assert from 'node:assert/strict';
import { fillActivityCreateDialog, fillEvaluationCreateDialog, fillFeeCreateDialog, navigateSpaPage, openDialogButton, openUrlModal, waitForPageQuery } from '../../../scripts/qa-harness-ui';
import { apiFetch } from '../setup/journey-api';
import { uiCommand, waitForMutationDialog } from './ui-command';

async function readEntity(page: Page, base: string, collection: string, id: string) {
	const response = await apiFetch(page, base, `/core/entities/${collection}/${id}`);
	assert(response.ok(), `${collection} readback HTTP ${response.status()}`);
	return await response.json() as Record<string, unknown>;
}

export async function exerciseActivityCreateEdit(page: Page, base: string) {
	const name = `Integration activity ${crypto.randomUUID()}`;
	assert(await openUrlModal(page, '/school/activities', 'create', { base }));
	await fillActivityCreateDialog(page, { name });
	const created = await uiCommand(page, '/commands/configure-activity', () => page.getByTestId('form-modal-submit').click());
	const { id } = created.request().postDataJSON() as { id: string };
	assert(id);
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	assert.equal((await readEntity(page, base, 'activities', id)).name, name);
	assert(await openUrlModal(page, `/school/activities/${id}/profile`, 'edit', { base }));
	const editedName = `${name} edited`;
	await page.getByRole('dialog').locator('input').first().fill(editedName);
	await uiCommand(page, '/commands/configure-activity', () => page.getByTestId('form-modal-submit').click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	assert.equal((await readEntity(page, base, 'activities', id)).name, editedName);
	await page.locator('aside[aria-label]').getByText(editedName, { exact: true }).first().waitFor();
	return 'Created and edited an isolated activity in the UI; persisted name and visible detail verified after reload';
}

export async function exerciseFeeEditArchive(page: Page, base: string) {
	const name = `Integration fee ${crypto.randomUUID()}`;
	assert(await openUrlModal(page, '/finance/fees', 'create', { base }));
	await fillFeeCreateDialog(page, name);
	const created = await uiCommand(page, '/commands/create-catalog-service', () => page.getByTestId('form-modal-submit').click());
	const { id } = await created.json() as { id: string };
	assert(id, 'Required disposable fee fixture missing');
	await waitForMutationDialog(page);
	assert(await openUrlModal(page, '/finance/fees', 'edit', { target: id, base }));
	const editedName = `${name} edited`;
	await page.locator('#fee-edit-name').fill(editedName);
	await page.locator('#fee-edit-amount').fill('32100');
	await uiCommand(page, '/commands/update-catalog-service', () => page.getByTestId('form-modal-submit').click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const edited = await readEntity(page, base, 'catalog-services', id);
	assert(JSON.stringify(edited.name).includes(editedName), 'Edited fee name must persist');
	const price = edited.defaultPrice as number | { amount: number };
	assert.equal(typeof price === 'number' ? price : price.amount, 32100, 'Edited fee amount must persist');
	assert(await openUrlModal(page, '/finance/fees', 'archive', { target: id, base }));
	await uiCommand(page, '/commands/archive-catalog-service', () => page.getByRole('dialog').getByRole('button', { name: /^(archiver|archive)$/i }).click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert.equal((await readEntity(page, base, 'catalog-services', id)).status, 'archived');
	return 'Created an isolated fee, edited name and amount, then archived it; persisted values verified after reload';
}

export async function exerciseGradeLevelEditDelete(page: Page, base: string) {
	const name = `Integration level ${crypto.randomUUID()}`;
	assert(await openUrlModal(page, '/configuration/grade-levels', 'create', { base }));
	await page.getByRole('dialog').locator('input').first().fill(name);
	const created = await uiCommand(page, '/commands/configure-grade-level', () => page.getByTestId('form-modal-submit').click());
	const { id } = created.request().postDataJSON() as { id: string };
	assert(id, 'Required disposable grade-level fixture missing');
	await waitForMutationDialog(page);
	const path = `/configuration/grade-levels/${id}`;
	assert(await openUrlModal(page, path, 'edit', { base }));
	const editedName = `${name} edited`;
	await page.getByRole('dialog').locator('input').first().fill(editedName);
	await uiCommand(page, '/commands/configure-grade-level', () => page.getByTestId('form-modal-submit').click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert(JSON.stringify((await readEntity(page, base, 'grade-levels', id)).name).includes(editedName));
	assert(await openUrlModal(page, path, 'delete', { base }));
	await uiCommand(page, '/entities/grade-levels/delete', () => page.getByRole('dialog').getByRole('button', { name: /^(supprimer|delete)$/i }).click());
	await waitForMutationDialog(page);
	await navigateSpaPage(page, `${base}/configuration/grade-levels`);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const deleted = await apiFetch(page, base, `/core/entities/grade-levels/${id}`);
	assert(deleted.status() === 404 || (deleted.ok() && await deleted.json() === null), 'Deleted grade level must remain absent');
	assert.equal(await page.getByText(editedName, { exact: true }).count(), 0);
	return 'Created an isolated grade level, edited it, then deleted it and verified absence after reload';
}

export async function exerciseEvaluationEditDelete(page: Page, base: string, classId: string) {
	const name = `Integration assessment ${crypto.randomUUID()}`;
	const list = `/classes/${classId}/evaluations`;
	await navigateSpaPage(page, `${base}${list}`);
	await waitForPageQuery(page);
	assert(await openDialogButton(page, /ajouter une évaluation|add evaluation|nouvelle évaluation|new evaluation|créer une évaluation/i), 'Assessment create action must open its form');
	assert(await fillEvaluationCreateDialog(page, name), 'Required assessment subject/period fixture missing');
	const created = await uiCommand(page, '/commands/create-assessment', () => page.getByTestId('form-modal-submit').click());
	const { id } = await created.json() as { id: string };
	assert(id);
	await waitForMutationDialog(page);
	const detail = `${list}/${id}/details`;
	assert(await openUrlModal(page, detail, 'edit', { base }));
	const editedName = `${name} edited`;
	await page.getByRole('dialog').locator('input:not([type="number"]):not([type="date"]):not([type="time"])').first().fill(editedName);
	await uiCommand(page, '/entities/assessments/save', () => page.getByTestId('form-modal-submit').click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert.equal((await readEntity(page, base, 'assessments', id)).title, editedName);
	await page.getByText(editedName, { exact: true }).first().waitFor();
	assert(await openUrlModal(page, detail, 'delete', { base }));
	await uiCommand(page, '/entities/assessments/delete', () => page.getByRole('dialog').getByRole('button', { name: /^(supprimer|delete)$/i }).click());
	await waitForMutationDialog(page);
	await navigateSpaPage(page, `${base}${list}`);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const deleted = await apiFetch(page, base, `/core/entities/assessments/${id}`);
	assert(deleted.status() === 404 || (deleted.ok() && await deleted.json() === null));
	assert.equal(await page.getByText(editedName, { exact: true }).count(), 0);
	return 'Created a disposable draft assessment, edited its title, deleted it, and verified persisted absence';
}

const catalogContracts: Record<string, { path: string; collection: string; create: string; edit: string }> = {
	'web.scenario.0163': { path: '/configuration/grade-scales', collection: 'grade-scales', create: '/commands/configure-grade-scale', edit: '/commands/configure-grade-scale' },
	'web.scenario.0170': { path: '/configuration/other/discipline', collection: 'disciplinary-actions', create: '/commands/configure-disciplinary-action', edit: '/commands/configure-disciplinary-action' },
	'web.scenario.0172': { path: '/configuration/other/subject-categories', collection: 'subject-categories', create: '/commands/configure-subject-category', edit: '/commands/configure-subject-category' },
	'web.scenario.0175': { path: '/configuration/permission-profiles', collection: 'staff-permission-profiles', create: '/commands/configure-permission-profile', edit: '/commands/configure-permission-profile' },
};

/** Each CRUD contract owns an unreferenced record so delete cannot damage another scenario. */
export async function exerciseCatalogCrud(page: Page, base: string, scenarioId: string): Promise<string | null> {
	const contract = catalogContracts[scenarioId];
	if (!contract)
		return null;
	const name = `Integration ${contract.collection} ${crypto.randomUUID()}`;
	assert(await openUrlModal(page, contract.path, 'create', { base }));
	await page.getByRole('dialog').locator('input').first().fill(name);
	const created = await uiCommand(page, contract.create, () => page.getByTestId('form-modal-submit').click());
	const body = await created.json() as { id?: string };
	const id = body.id ?? (created.request().postDataJSON() as { id: string }).id;
	assert(id, 'Created catalog record ID missing');
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert.equal((await readEntity(page, base, contract.collection, id)).name, name);
	await page.locator('main').getByText(name, { exact: true }).waitFor();
	assert(await openUrlModal(page, contract.path, 'edit', { base, target: id }));
	const editedName = `${name} edited`;
	await page.getByRole('dialog').locator('input').first().fill(editedName);
	if (contract.collection === 'staff-permission-profiles') {
		const preview = await uiCommand(page, contract.edit, () => page.getByTestId('form-modal-submit').click());
		assert.equal(preview.request().postDataJSON().previewOnly, true);
	}
	await uiCommand(page, contract.edit, () => page.getByTestId('form-modal-submit').click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert.equal((await readEntity(page, base, contract.collection, id)).name, editedName);
	await page.locator('main').getByText(editedName, { exact: true }).waitFor();
	assert(await openUrlModal(page, contract.path, 'delete', { base, target: id }));
	await uiCommand(page, contract.collection === 'grade-scales' ? '/commands/configure-grade-scale' : `/entities/${contract.collection}/delete`, () => page.getByRole('dialog').getByRole('button', { name: /^(supprimer|delete)$/i }).click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const deleted = await apiFetch(page, base, `/core/entities/${contract.collection}/${id}`);
	assert(deleted.status() === 404 || (deleted.ok() && await deleted.json() === null), 'Deleted catalog record must remain absent');
	assert.equal(await page.locator('main').getByText(editedName, { exact: true }).count(), 0);
	return 'Created, edited, and deleted an isolated catalog record through the UI; verified persisted state after each reload';
}

export async function exerciseReportDefinitionLifecycle(page: Page, base: string, gradeLevelId: string, gradeScaleId: string) {
	const create = async () => {
		const name = `Integration report model ${crypto.randomUUID()}`;
		assert(await openUrlModal(page, '/configuration/report-cards', 'create', { base }));
		await page.getByRole('dialog').locator('input').first().fill(name);
		await page.getByRole('dialog').locator('select').nth(0).selectOption(gradeLevelId);
		const response = await uiCommand(page, '/commands/create-report-card-definition', () => page.getByTestId('form-modal-submit').click());
		const { id } = await response.json() as { id: string };
		assert(id);
		await waitForMutationDialog(page);
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForPageQuery(page);
		assert.equal((await readEntity(page, base, 'definitions', id)).name, name);
		return id;
	};
	const discarded = await create();
	assert(await openUrlModal(page, `/configuration/report-cards/${discarded}`, 'delete', { base }));
	await uiCommand(page, '/entities/definitions/delete', () => page.getByRole('dialog').getByRole('button', { name: /^(supprimer|delete)$/i }).click());
	await waitForMutationDialog(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	const deleted = await apiFetch(page, base, `/core/entities/definitions/${discarded}`);
	assert(deleted.status() === 404 || (deleted.ok() && await deleted.json() === null));
	const published = await create();
	await navigateSpaPage(page, `${base}/configuration/report-cards/${published}`);
	await waitForPageQuery(page);
	await uiCommand(page, '/entities/definitions/save', () => page.locator('aside[aria-label]').getByRole('button', { name: /publier le modèle|publish model/i }).click());
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForPageQuery(page);
	assert.equal((await readEntity(page, base, 'definitions', published)).status, 'published');
	return 'Created and deleted an isolated draft model; created and published another, with persisted readback after reload';
}
