import type { StudentBilling } from '$lib/types/school';

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

export const billingStatusTone: Record<'paid' | 'partial' | 'due' | 'overdue', string> = {
	paid: 'bg-secondary text-foreground/80',
	partial: 'bg-highlight-soft text-highlight',
	due: 'bg-secondary text-muted-foreground',
	overdue: 'bg-destructive/10 text-destructive',
};
