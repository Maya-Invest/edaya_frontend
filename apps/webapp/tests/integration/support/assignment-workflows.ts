import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import { apiFetch, resolveSchoolId } from '../setup/journey-api';
import { openUrlModal, waitForPageQuery } from '../../../scripts/qa-harness-ui';
import { uiCommand, waitForMutationDialog } from './ui-command';

export async function exerciseAssignmentCrud(page: Page, base: string, scenarioId: string, entities: MatrixEntities): Promise<string | null> {
  if (!['web.scenario.0054', 'web.scenario.0179'].includes(scenarioId)) return null;
  const hub = scenarioId === 'web.scenario.0179';
  const original = await apiFetch(page, base, `/core/entities/class-groups/${entities.classId}`);
  assert(original.ok());
  const classroom = await original.json() as Record<string,unknown>;
  const classId = crypto.randomUUID();
  const teacherId = crypto.randomUUID();
  const fixture = async (command: string, data: Record<string,unknown>) => {
    const response = await apiFetch(page, base, `/core/commands/${command}`, { method: 'POST', data });
    assert(response.ok(), `Assignment fixture ${command}: HTTP ${response.status()} ${response.ok() ? "" : await response.text()}`);
  };
  await fixture('create-class-group', { ...classroom, id: classId, name: `Integration assignment ${classId}` });
  await fixture('register-teacher', { id: teacherId, schoolId: await resolveSchoolId(page, base), firstName: 'Integration', lastName: teacherId, isActive: true });
  const path = hub ? '/configuration/tools/teacher-assignments' : `/school/teachers/${teacherId}/assignments`;
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  assert(await openUrlModal(page, path, hub ? 'create' : 'form', { base }));
  const selects = page.getByRole('dialog').locator('select');
  if (hub) {
    await selects.nth(0).locator(`option[value="${teacherId}"]`).waitFor({ state: 'attached' });
    await selects.nth(0).selectOption(teacherId);
  }
  await selects.nth(hub ? 1 : 0).selectOption('homeroom');
  await selects.nth(hub ? 2 : 1).selectOption(classId);
  const created = await uiCommand(page, '/entities/teacher-assignments/save', () => page.getByTestId('form-modal-submit').click());
  const id = (created.request().postDataJSON() as { id: string }).id;
  assert(id);
  await waitForMutationDialog(page);
  const persisted = async (kind: string) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    const response = await apiFetch(page, base, `/core/entities/teacher-assignments/${id}`);
    assert(response.ok());
    const value = await response.json() as Record<string,unknown>;
    assert.equal(value.teacherId, teacherId);
    assert.equal(value.classGroupId, classId);
    assert.equal(value.kind, kind);
    await page.locator('main').getByText(`Integration assignment ${classId}`, { exact: false }).filter({ visible: true }).first().waitFor();
  };
  await persisted('homeroom');
  if (!hub) {
    assert(await openUrlModal(page, path, 'form', { base, target: id }));
    await selects.nth(0).selectOption('subject');
    const subject = selects.nth(2);
    await subject.locator('option:not([value=""])').first().waitFor({ state: 'attached' });
    await subject.selectOption({ index: 1 });
    await uiCommand(page, '/entities/teacher-assignments/save', () => page.getByTestId('form-modal-submit').click());
    await waitForMutationDialog(page);
    await persisted('subject');
    assert(await openUrlModal(page, path, 'delete-assignment', { base, target: id }));
  }
  await uiCommand(page, '/entities/teacher-assignments/delete', () => hub
    ? page.locator('main li').filter({ has: page.locator(`a[href*="/school/teachers/${teacherId}"]`) }).getByRole('button').click()
    : page.getByRole('dialog').getByRole('button', { name: /^(supprimer|delete)$/i }).click());
  if (!hub) await waitForMutationDialog(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const deleted = await apiFetch(page, base, `/core/entities/teacher-assignments/${id}`);
  assert(deleted.status() === 404 || (deleted.ok() && await deleted.json() === null));
  return `Created${hub ? '' : ', changed the assignment kind,'} and removed an isolated teacher assignment; persisted relationship verified`;
}
