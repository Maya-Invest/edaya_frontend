import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { apiFetch } from '../setup/journey-api';
import { waitForPageQuery } from '../../../scripts/qa-harness-ui';
import { uiCommand, waitForMutationDialog } from './ui-command';

/** The caller has navigated to an enrolled student's Documents tab. */
export async function exerciseStudentDocument(page: Page, base: string): Promise<string> {
  const card = page.locator('[data-document-type="schooling-certificate.v1"]');
  await card.getByRole('button').click();
  await page.getByTestId('document-generate').click();
  const response = await uiCommand(page, '/commands/request-document-issuance', () => page.getByRole('dialog').getByRole('button', { name: /générer le pdf|generate pdf/i }).click());
  assert(response.ok(), `Document issuance HTTP ${response.status()}`);
  const issuance = await response.json() as { id: string };
  assert(issuance.id, 'Issuance command must return an ID');
  await waitForMutationDialog(page);
  await card.getByRole('button').click();
  const grantResponse = await uiCommand(page, '/queries/grant-document-download', () => page.getByTestId(`document-download-${issuance.id}`).click());
  assert(grantResponse.ok(), `Document download grant HTTP ${grantResponse.status()}`);
  const grant = await grantResponse.json() as { downloadUrl: string };
  const url = new URL(grant.downloadUrl);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'Integration downloads must stay on the disposable local stack');
  const file = await page.request.get(grant.downloadUrl);
  assert(file.ok(), `Document bytes HTTP ${file.status()}`);
  assert((await file.body()).subarray(0, 5).toString() === '%PDF-', 'Downloaded artifact must be a PDF');
  await card.getByRole('button').click();
  await page.getByTestId('document-void').click();
  const dialog = page.getByRole('dialog');
  const reason = `Integration cancellation ${issuance.id}`;
  await dialog.locator('textarea').fill(reason);
  await uiCommand(page, '/commands/void-document-issuance', () => dialog.getByTestId('form-modal-submit').click());
  await waitForMutationDialog(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  const saved = await apiFetch(page, base, '/core/queries/get-document-issuance', { method: 'POST', data: { id: issuance.id } });
  assert(saved.ok(), `Document readback HTTP ${saved.status()}`);
  assert.equal((await saved.json() as { status: string }).status, 'voided');
  const denied = await apiFetch(page, base, '/core/queries/grant-document-download', { method: 'POST', data: { id: issuance.id } });
  assert([400, 403, 409, 422].includes(denied.status()), `Voided document must not issue another download grant: HTTP ${denied.status()}`);
  return 'Generated a PDF, downloaded its bytes, voided it and verified persisted status and denied access';
}
