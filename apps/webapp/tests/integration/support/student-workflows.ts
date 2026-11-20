import { chooseOption } from './custom-select';
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { apiFetch } from '../setup/journey-api';
import { openUrlModal, waitForPageQuery } from '../../../scripts/qa-harness-ui';
import { uiCommand, waitForMutationDialog } from './ui-command';

async function student(page: Page, base: string, id: string) {
  const response = await apiFetch(page, base, `/core/entities/students/${id}`);
  assert(response.ok(), `Student fixture/readback HTTP ${response.status()}`);
  return await response.json() as { status: string; firstName: string; lastName: string; photoAttachmentId?: string };
}

export async function exerciseStudentStatus(page: Page, base: string, id: string) {
  const before = await student(page, base, id);
  const status = before.status === 'active' ? 'inactive' : 'active';
  const change = async (value: string) => {
    assert(await openUrlModal(page, `/school/students/${id}/profile`, 'change-status', { base }), 'Student status form missing');
    const select = page.getByTestId('form-modal').locator('select[data-select-value]');
    await chooseOption(select, value);
    await uiCommand(page, '/commands/update-student-status', () => page.getByTestId('form-modal-submit').click());
    await waitForMutationDialog(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    assert.equal((await student(page, base, id)).status, value);
  };
  try { await change(status); }
  finally { if ((await student(page, base, id)).status !== before.status) await change(before.status); }
  return 'Changed student status through the UI, verified after reload, and restored the fixture';
}

export async function exerciseStudentPhoto(page: Page, base: string, id: string) {
  const before = await student(page, base, id);
  // Generate a deterministic PNG in the browser, exercising the actual crop/upload flow.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d')!; context.fillStyle = '#194db8'; context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  await page.locator('input[type="file"][accept*="image"]').last().setInputFiles({ name: 'integration-portrait.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const crop = page.getByTestId('profile-photo-crop-dialog');
  await uiCommand(page, '/commands/publish-student-photo', () => crop.getByRole('button', { name: /utiliser|confirmer|use|confirm/i }).click());
  await crop.waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const saved = await student(page, base, id);
  assert(saved.photoAttachmentId && saved.photoAttachmentId !== before.photoAttachmentId, 'Photo attachment must persist on the student');
  const portrait = page.getByRole('img', { name: `${saved.firstName} ${saved.lastName}`, exact: true }).last();
  await portrait.waitFor({ state: 'visible' });
  await portrait.evaluate(async element => {
    const image = element as HTMLImageElement;
    await image.decode();
    if (image.naturalWidth === 0) throw new Error('Persisted portrait did not load');
  });
  return 'Cropped and uploaded a portrait, then verified its persisted attachment and rendered image after reload';
}

export async function exerciseStudentTransfer(page: Page, base: string, id: string) {
  const enrolled = await apiFetch(page, base, '/core/entities/enrollments/list', { method: 'POST', data: { studentId: id, status: 'active' } });
  assert(enrolled.ok(), 'Required active enrollment query failed');
  const enrollmentData = await enrolled.json() as Array<{ studentId: string; status: string; classGroupId: string }>;
  const currentEnrollment = enrollmentData.find(row => row.studentId === id && row.status === 'active');
  assert(currentEnrollment, 'Required active enrollment fixture missing');
  const classroomResponse = await apiFetch(page, base, `/core/entities/class-groups/${currentEnrollment.classGroupId}`);
  assert(classroomResponse.ok());
  const classroom = await classroomResponse.json() as { schoolId: string; academicYearId: string; gradeLevelId: string };
  const targetName = `Transfer ${crypto.randomUUID()}`;
  const created = await apiFetch(page, base, '/core/commands/create-class-group', { method: 'POST', data: { ...classroom, id: `class-${crypto.randomUUID()}`, name: targetName, attendanceMode: 'daily' } });
  assert(created.ok(), `Required transfer class fixture HTTP ${created.status()}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const path = `/school/students/${id}/profile`;
  assert(await openUrlModal(page, path, 'change-class', { base }), 'Required transfer form missing');
  let dialog = page.getByRole('dialog');
  await dialog.locator('button[aria-haspopup="listbox"]').click();
  const options = page.locator('[role="option"]:visible');
  // Bits UI exposes the current choice through aria-selected.
  const current = page.locator('[role="option"][aria-selected="true"]:visible');
  const originalLabel = (await current.innerText()).trim();
  const alternatives = await options.all();
  const alternative = [];
  for (const option of alternatives) if ((await option.innerText()).trim() !== originalLabel) alternative.push(option);
  assert(alternative.length, 'Transfer scenario requires another class fixture');
  await alternative[0]!.click();
  const transfer = async () => {
    const response = await uiCommand(page, '/commands/transfer-student', () => page.getByRole('dialog').getByTestId('form-modal-submit').click());
    const input = response.request().postDataJSON() as { nextEnrollmentId: string; nextClassGroupId: string };
    await waitForMutationDialog(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPageQuery(page);
    const saved = await apiFetch(page, base, `/core/entities/enrollments/${input.nextEnrollmentId}`);
    assert(saved.ok(), `Transferred enrollment HTTP ${saved.status()}`);
    const enrollment = await saved.json() as { studentId: string; classGroupId: string; status: string };
    assert.equal(enrollment.studentId, id);
    assert.equal(enrollment.classGroupId, input.nextClassGroupId);
    assert.equal(enrollment.status, 'active');
  };
  await transfer();
  assert(await openUrlModal(page, path, 'change-class', { base }));
  dialog = page.getByRole('dialog');
  await dialog.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: originalLabel, exact: true }).click();
  await transfer();
  return 'Transferred the student to another class, verified the active enrollment after reload, then restored the original class';
}
