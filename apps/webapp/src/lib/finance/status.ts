import type { StudentChargeStatus } from '$lib/types/school';

export const billingStatusTone: Record<StudentChargeStatus, string> = {
	paid: 'bg-secondary text-foreground/80',
	partial: 'bg-highlight-soft text-highlight',
	pending: 'bg-secondary text-muted-foreground',
	overdue: 'bg-destructive/10 text-destructive',
	cancelled: 'bg-muted text-muted-foreground',
	waived: 'bg-secondary text-foreground/70',
};
