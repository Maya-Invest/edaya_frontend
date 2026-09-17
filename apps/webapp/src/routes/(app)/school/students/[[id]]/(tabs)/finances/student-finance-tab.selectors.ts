import type { StudentBilling } from '$lib/types/school';
import { billingStatusTone } from '$lib/finance/status';

export { billingStatusTone };

export function summarizeStudentFinances(billing: readonly StudentBilling[], studentId: string): {
	studentBilling: StudentBilling[];
	total: number;
	paid: number;
	balance: number;
} {
	const studentBilling = billing.filter(item => item.studentId === studentId);
	const total = studentBilling.reduce((accumulator, item) => accumulator + item.total, 0);
	const paid = studentBilling.reduce((accumulator, item) => accumulator + item.paid, 0);
	return { studentBilling, total, paid, balance: total - paid };
}
