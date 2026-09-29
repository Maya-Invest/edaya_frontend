import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { apiFetch } from '../setup/journey-api';
import { navigateSpaPage, openUrlModal, waitForPageQuery } from '../../../scripts/qa-harness-ui';
import { uiCommand, waitForMutationDialog } from './ui-command';

type Row = Record<string, any>;
const amount = (value: number | { amount: number }) => typeof value === 'number' ? value : value.amount;
async function read(page: Page, base: string, collection: string, id: string): Promise<Row> {
  const response = await apiFetch(page, base, `/core/entities/${collection}/${id}`);
  assert(response.ok(), `${collection} fixture/readback HTTP ${response.status()}`);
  return await response.json() as Row;
}
async function command(page: Page, base: string, name: string, data: Row): Promise<Row> {
  const response = await apiFetch(page, base, `/core/commands/${name}`, { method: 'POST', data });
  assert(response.ok(), `Required finance fixture ${name}: HTTP ${response.status()}: ${await response.text()}`);
  return await response.json() as Row;
}
async function financeFixture(page: Page, base: string, classId: string) {
  const classroom = await read(page, base, 'class-groups', classId);
  const school = await read(page, base, 'schools', classroom.schoolId);
  const year = classroom.academicYearId;
  assert(year && school.financeCurrency, 'Required finance year/currency missing');
  const studentId = `student-${crypto.randomUUID()}`;
  await command(page, base, 'register-student', { id: studentId, schoolId: classroom.schoolId, firstName: 'Integration', lastName: crypto.randomUUID(), sendAccountInvitation: false });
  await command(page, base, 'enroll-student', { id: `enrollment-${crypto.randomUUID()}`, studentId, classGroupId: classId });
  const serviceId = `service-${crypto.randomUUID()}`;
  await command(page, base, 'create-catalog-service', { id: serviceId, academicYearId: year, name: `Integration ${serviceId}`, defaultPrice: 1000, currency: school.financeCurrency, billingTerms: { kind: 'one_time', installments: [] }, status: 'active', enrollmentMode: 'opt_in' });
  await command(page, base, 'enroll-student-in-service', { id: `service-enrollment-${crypto.randomUUID()}`, studentId, catalogServiceId: serviceId });
  const chargesResponse = await apiFetch(page, base, '/core/entities/student-charges/list', { method: 'POST', data: { studentId, academicYearId: year } });
  assert(chargesResponse.ok(), 'Required finance charge query failed');
  const data = await chargesResponse.json() as Row[] | { items: Row[] };
  const charges = (Array.isArray(data) ? data : data.items).filter(row => row.studentId === studentId);
  assert.equal(charges.length, 1, 'Required single isolated charge missing');
  const paymentId = `payment-${crypto.randomUUID()}`;
  await command(page, base, 'record-payment', { id: paymentId, studentId, academicYearId: year, amount: 400, method: 'cash', paymentDate: new Date().toISOString().slice(0, 10), allocation: { mode: 'account_only' } });
  const payment = await read(page, base, 'payments', paymentId);
  return { studentId, paymentId, accountId: payment.accountId as string, chargeId: charges[0]!.id as string };
}

export async function exerciseFinanceMutation(page: Page, base: string, classId: string, operation: 'allocate' | 'reverse') {
  const fixture = await financeFixture(page, base, classId);
  assert.equal(amount((await read(page, base, 'student-year-accounts', fixture.accountId)).availableBalance), 400);
  if (operation === 'allocate') {
    assert(await openUrlModal(page, `/finance/billing/${fixture.chargeId}`, 'allocate', { base }));
    await uiCommand(page, '/commands/allocate-account-balance', () => page.getByTestId('form-modal-submit').click());
  } else {
    assert(await openUrlModal(page, '/finance/payment', 'reverse', { target: fixture.paymentId, base }));
    await uiCommand(page, '/commands/reverse-payment', () => page.getByTestId('form-modal-submit').click());
  }
  await waitForMutationDialog(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForPageQuery(page);
  assert.equal(amount((await read(page, base, 'student-year-accounts', fixture.accountId)).availableBalance), 0);
  const charge = await read(page, base, 'student-charges', fixture.chargeId);
  assert.equal(amount(charge.allocatedAmount), operation === 'allocate' ? 400 : 0);
  if (operation === 'reverse') assert.equal((await read(page, base, 'payments', fixture.paymentId)).status, 'reversed');
  return `${operation}: UI command persisted the expected payment, charge and account balances after reload`;
}

export async function exerciseReconciliation(page: Page, base: string) {
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/queries/get-finance-reconciliation') && response.request().method() === 'POST'),
    page.reload({ waitUntil: 'domcontentloaded' }),
  ]);
  assert(response.ok(), `Reconciliation HTTP ${response.status()}`);
  const report = await response.json() as { balanced: boolean; accounts: Row[]; charges: Row[] };
  assert(report.accounts.length > 0 && report.charges.length > 0, 'Reconciliation requires accounts and charges');
  assert.equal(report.balanced, true);
  assert(report.accounts.every(row => row.difference === 0));
  assert(report.charges.every(row => row.difference === 0));
  await page.getByText(/^(équilibré|balanced)$/i).waitFor();
  await page.getByText(/aucun écart de réconciliation|no reconciliation differences/i).waitFor();
  return 'Loaded real accounts and charges, verified zero ledger differences and the displayed balanced state';
}
