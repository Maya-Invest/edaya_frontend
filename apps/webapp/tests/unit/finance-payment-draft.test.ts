import type { StudentBilling } from '../../src/lib/types/school';
import { plugin } from 'bun';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'finance-payment-runes', setup(build) {
	build.onLoad({ filter: /payment-draft\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
let scope = 'school:year';
let grants = new Set(['PAYMENT_RECORD', 'PAYMENT_ALLOCATE']);
let charges: StudentBilling[] = [];
let available = 0;
let readFailure = false;
let writeResult = true;
let pendingRead: Promise<StudentBilling[]> | undefined;
let pendingWrite: Promise<boolean> | undefined;
const writes: unknown[] = [];
const charge = { id: 'charge', enrollmentId: 'enrollment', catalogServiceId: 'fee', studentId: 'student', classId: 'class', accountId: 'account', academicYearId: 'year', label: 'Tuition', currency: 'USD', total: 1000, netAmount: 1000, paid: 0, remaining: 1000, status: 'pending', installments: [], dueDate: '2026-01-01' } as StudentBilling;
mock.module('$lib/auth/session.svelte', () => ({ authSession: { school: { financeCurrency: 'USD' } } }));
mock.module('$lib/permissions', () => ({ hasPermission: (permission: string) => grants.has(permission) }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({}) }));
mock.module('$lib/api/finance-workspace', () => ({ financeReadKey: () => scope, financeScope: () => ({ schoolId: 'school', academicYearId: 'year' }), readAllBilling: async () => { if (readFailure) throw new Error('Unavailable'); return pendingRead ?? charges; } }));
mock.module('$lib/api/finance-client', () => ({ financeQuery: async () => ({ accountId: 'account', available: { amount: available } }) }));
mock.module('$lib/api/mutations/billing.mutations', () => ({ recordPaymentMutation: async (input: unknown) => { writes.push(input); return pendingWrite ?? writeResult; } }));
const { FinancePaymentDraft } = await import('../../src/lib/finance/payment-draft.svelte');
async function draft(preselected?: StudentBilling) {
	const result = new FinancePaymentDraft();
	result.reset(preselected);
	result.studentId = 'student';
	await result.loadStudent();
	return result;
}
beforeEach(() => {
	scope = 'school:year';
	grants = new Set(['PAYMENT_RECORD', 'PAYMENT_ALLOCATE']);
	charges = [charge];
	available = 0;
	readFailure = false;
	writeResult = true;
	pendingRead = undefined;
	pendingWrite = undefined;
	writes.length = 0;
});
describe('shared finance payment draft', () => {
	test('starts with no selected fees and submits only explicitly selected amounts', async () => {
		available = 200;
		const state = await draft();
		state.amount = '8';
		expect(state.mode).toBe('targeted');
		expect(state.allocations).toEqual([]);
		expect(state.canSubmit).toBe(false);
		state.toggle(charge, true);
		expect(state.allocations).toMatchObject([{ chargeId: 'charge', amount: 1000 }]);
		expect(state.resultingCredit).toBe(0);
		expect(await state.submit('Saved')).toBe(true);
		expect(writes[0]).toMatchObject({ amount: 800, allocation: { mode: 'targeted', targets: [{ chargeId: 'charge', amount: 1000 }] } });
	});
	test('billing preselects only its charge while retaining other open fees', async () => {
		charges = [charge, { ...charge, id: 'other', remaining: 500 }];
		const state = await draft(charge);
		expect(state.targets).toEqual({ charge: '10' });
		expect(state.charges).toHaveLength(2);
		expect(state.canSubmit).toBe(true);
	});
	test('a student without charges can explicitly deposit without allocation permission', async () => {
		charges = [];
		grants.delete('PAYMENT_ALLOCATE');
		const state = await draft();
		state.amount = '5';
		expect(state.canSubmit).toBe(false);
		state.mode = 'account_only';
		expect(state.resultingCredit).toBe(500);
		expect(await state.submit('Saved')).toBe(true);
		expect(writes[0]).toMatchObject({ allocation: { mode: 'account_only' } });
	});
	test('blocks over-allocation, missing permissions, unavailable reads and changed workspace', async () => {
		const state = await draft(charge);
		state.targets = { charge: '11' };
		expect(state.canSubmit).toBe(false);
		state.targets = { charge: '10' };
		grants.delete('PAYMENT_ALLOCATE');
		expect(state.canSubmit).toBe(false);
		grants.add('PAYMENT_ALLOCATE');
		scope = 'other-school:year';
		expect(await state.submit('Saved')).toBe(false);
		readFailure = true;
		const failed = await draft();
		expect(failed.error).toBe(true);
		expect(failed.canSubmit).toBe(false);
		expect(writes).toHaveLength(0);
	});
	test('ignores a student response received after workspace changes', async () => {
		let resolve!: (rows: StudentBilling[]) => void;
		pendingRead = new Promise(done => { resolve = done; });
		const state = new FinancePaymentDraft();
		state.reset();
		state.studentId = 'student';
		const loading = state.loadStudent();
		scope = 'other-school:year';
		resolve([charge]);
		await loading;
		expect(state.charges).toEqual([]);
		expect(state.loadedStudent).toBe('');
	});
	test('prevents duplicate submissions and preserves the draft on failed writes', async () => {
		let resolve!: (success: boolean) => void;
		pendingWrite = new Promise(done => { resolve = done; });
		const state = await draft(charge);
		state.notes = 'Keep this draft';
		const first = state.submit('Saved');
		expect(await state.submit('Saved')).toBe(false);
		resolve(false);
		expect(await first).toBe(false);
		expect(writes).toHaveLength(1);
		expect(state.notes).toBe('Keep this draft');
		expect(state.targets).toEqual({ charge: '10' });
		expect(state.busy).toBe(false);
	});
});
