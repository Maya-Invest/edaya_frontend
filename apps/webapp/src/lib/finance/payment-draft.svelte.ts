import type { AllocationMode, PaymentMethod, StudentFinanceSummary } from '$lib/api/finance-types';
import type { StudentBilling } from '$lib/types/school';
import { financeQuery } from '$lib/api/finance-client';
import { readAllBilling, financeScope, financeReadKey } from '$lib/api/finance-workspace';
import { recordPaymentMutation } from '$lib/api/mutations/billing.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { hasPermission } from '$lib/permissions';
import { SvelteDate } from 'svelte/reactivity';
import { previewFifoAllocation } from './allocation-preview';
import { majorToMinor, minorToMajor, parseMajorInput } from './money';

/** Both payment entry points own one draft; changing workspace invalidates its context. */
export class FinancePaymentDraft {
	studentId = $state('');
	selectedClassId = $state<string | undefined>();
	amount = $state('');
	date = $state('');
	method = $state<PaymentMethod>('cash');
	reference = $state('');
	notes = $state('');
	mode = $state<AllocationMode>('targeted');
	targets = $state<Record<string, string>>({});
	charges = $state<StudentBilling[]>([]);
	accountId = $state<string | undefined>();
	available = $state(0);
	loading = $state(false);
	error = $state(false);
	busy = $state(false);
	loadedStudent = $state('');
	private revision = 0;
	private scope = '';
	private preselected: StudentBilling | undefined;
	get currency() { return authSession.school?.financeCurrency ?? ''; }
	reset(charge?: StudentBilling) {
		this.revision++;
		this.studentId = charge?.studentId ?? '';
		this.selectedClassId = charge?.classId;
		this.preselected = charge;
		this.amount = charge ? String(minorToMajor(charge.remaining, this.currency)) : '';
		this.date = new SvelteDate().toISOString().slice(0, 10);
		this.method = 'cash';
		this.reference = '';
		this.notes = '';
		this.mode = 'targeted';
		this.targets = {};
		this.charges = [];
		this.accountId = undefined;
		this.available = 0;
		this.loadedStudent = '';
		this.error = false;
		this.scope = financeReadKey('payment-draft');
	}

	async loadStudent() {
		const id = this.studentId;
		const revision = ++this.revision;
		const scope = financeReadKey('payment-draft');
		this.loading = true;
		this.error = false;
		this.targets = {};
		this.loadedStudent = '';
		this.accountId = undefined;
		this.available = 0;
		this.charges = [];
		if (!id) {
			this.loading = false;
			return;
		}
		try {
			const [charges, summary] = await Promise.all([
				readAllBilling({ studentId: id, due: 'outstanding' }),
				financeQuery<StudentFinanceSummary>(getBrowserSchoolClient(), 'getStudentFinanceSummary', 'get-student-finance-summary', { studentId: id, academicYearId: financeScope().academicYearId }),
			]);
			if (revision !== this.revision || scope !== financeReadKey('payment-draft'))
				return;
			this.charges = charges;
			this.accountId = summary.accountId;
			this.available = summary.available.amount;
			this.loadedStudent = id;
			this.scope = scope;
			const selected = charges.find(row => row.id === this.preselected?.id);
			if (selected)
				this.targets = { [selected.id]: String(minorToMajor(selected.remaining, this.currency)) };
		}
		catch {
			if (revision === this.revision)
				this.error = true;
		}
		finally {
			if (revision === this.revision)
				this.loading = false;
		}
	}

	minor(value: string) {
		const parsed = parseMajorInput(value);
		return parsed === null ? 0 : majorToMinor(parsed, this.currency);
	}

	get received() { return this.minor(this.amount); }
	get allocations() {
		if (this.mode === 'account_only')
			return [];
		if (this.mode === 'fifo')
			return previewFifoAllocation(this.accountId ?? '', this.received + this.available, 0, this.charges).allocations;
		return Object.entries(this.targets).map(([chargeId, value]) => ({ chargeId, amount: this.minor(value), label: this.charges.find(row => row.id === chargeId)?.label ?? '' }));
	}

	get resultingCredit() { return this.available + this.received - this.allocations.reduce((sum, row) => sum + row.amount, 0); }
	get permissionContext() { return { studentId: this.studentId, classId: this.charges[0]?.classId ?? this.selectedClassId ?? this.preselected?.classId }; }
	get canSubmit() {
		if (this.busy || this.loading || this.error || this.loadedStudent !== this.studentId || !this.studentId || this.received <= 0 || !this.date || this.scope !== financeReadKey('payment-draft') || !hasPermission('PAYMENT_RECORD', this.permissionContext))
			return false;
		if (this.mode !== 'account_only' && !hasPermission('PAYMENT_ALLOCATE', this.permissionContext))
			return false;
		if (this.mode === 'targeted' && this.allocations.length === 0)
			return false;
		return this.resultingCredit >= 0 && this.allocations.every(target => target.amount > 0 && target.amount <= (this.charges.find(row => row.id === target.chargeId)?.remaining ?? 0));
	}

	toggle(charge: StudentBilling, selected: boolean) {
		if (!selected) {
			const next = { ...this.targets };
			delete next[charge.id];
			this.targets = next;
			return;
		}
		this.targets = { ...this.targets, [charge.id]: String(minorToMajor(Math.min(charge.remaining, Math.max(0, this.resultingCredit)), this.currency)) };
	}

	async submit(successMessage: string) {
		if (!this.canSubmit)
			return false;
		const input = { studentId: this.studentId, accountId: this.accountId, academicYearId: financeScope().academicYearId, amount: this.received, paymentDate: new SvelteDate(`${this.date}T12:00:00`).toISOString(), method: this.method, reference: this.reference, notes: this.notes, allocation: this.mode === 'targeted' ? { mode: this.mode, targets: this.allocations.map(({ chargeId, amount }) => ({ chargeId, amount })) } : { mode: this.mode }, successMessage };
		this.busy = true;
		try {
			return await recordPaymentMutation(input);
		}
		finally { this.busy = false; }
	}
}
