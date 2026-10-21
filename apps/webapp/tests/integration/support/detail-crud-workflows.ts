import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import { apiFetch } from '../setup/journey-api';
import { openUrlModal, waitForPageQuery } from '../../../scripts/qa-harness-ui';
import { uiCommand, waitForMutationDialog } from './ui-command';

export async function exerciseDetailCrud(page: Page, base: string, id: string, entities: MatrixEntities): Promise<string | null> {
  const contracts = {
    'web.scenario.0031': { path: `/school/students/${entities.studentId}/profile`, collection: 'student-notes', create: 'note', edit: 'edit-note', remove: null, command: '/commands/create-student-note', update: '/commands/update-student-note', field: 'body', input: 'textarea' },
    'web.scenario.0055': { path: `/school/teachers/${entities.teacherId}/availability`, collection: 'teacher-unavailabilities', create: 'add-unavailability', edit: 'edit-unavailability', remove: 'delete-unavailability', command: '/entities/teacher-unavailabilities/save', update: '/entities/teacher-unavailabilities/save', field: 'reason', input: 'input:not([type="time"]):not([type="date"]):not([type="datetime-local"])' },
    'web.scenario.0159': { path: `/configuration/structure/subjects/${entities.configurationSubjectId ?? entities.subjectId}/progression`, collection: 'subject-matters', create: 'add-chapter', edit: 'edit-chapter', remove: 'delete-chapter', command: '/commands/configure-subject-matter', update: '/commands/configure-subject-matter', field: 'name', input: 'input' },
  };
  const contract = contracts[id as keyof typeof contracts];
  if (!contract) return null;
  const text = `Integration ${crypto.randomUUID()}`;
  assert(await openUrlModal(page, contract.path, contract.create, { base }));
  await page.getByRole('dialog').locator(contract.input).first().fill(text);
  const created = await uiCommand(page, contract.command, () => page.getByTestId('form-modal-submit').click());
  const result = await created.json() as { id?: string };
  const entityId = result.id ?? (created.request().postDataJSON() as { id: string }).id;
  assert(entityId);
  await waitForMutationDialog(page);
  const persisted = async (expected: string) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    const response = await apiFetch(page, base, `/core/entities/${contract.collection}/${entityId}`);
    assert(response.ok());
    assert.equal((await response.json() as Record<string,unknown>)[contract.field], expected);
    await page.locator('aside[aria-label]').getByText(expected, { exact: id === 'web.scenario.0159' }).filter({ visible: true }).first().waitFor();
  };
  await persisted(text);
  assert(await openUrlModal(page, contract.path, contract.edit, { base, target: entityId }));
  await page.getByRole('dialog').locator(contract.input).first().fill(`${text} edited`);
  await uiCommand(page, contract.update, () => page.getByTestId('form-modal-submit').click());
  await waitForMutationDialog(page);
  await persisted(`${text} edited`);
  if (contract.remove) {
    assert(await openUrlModal(page, contract.path, contract.remove, { base, target: entityId }));
    const deleteCommand = contract.collection === 'subject-matters'
      ? '/commands/remove-subject-matter'
      : `/entities/${contract.collection}/delete`;
    await uiCommand(page, deleteCommand, () => page.getByRole('dialog').getByRole('button', { name: /^(supprimer|delete)$/i }).click());
    await waitForMutationDialog(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    const response = await apiFetch(page, base, `/core/entities/${contract.collection}/${entityId}`);
    assert(response.status() === 404 || (response.ok() && await response.json() === null));
    assert.equal(await page.locator('aside[aria-label]').getByText(`${text} edited`, { exact: false }).count(), 0);
  }
  return `Executed create/edit${contract.remove ? '/delete' : ''} in the UI and verified persisted values after reload`;
}
