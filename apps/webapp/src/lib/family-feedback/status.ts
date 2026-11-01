import type { FamilyFeedbackCampaignStatus } from '$lib/api/family-feedback-types';

export const FAMILY_FEEDBACK_STATUS_TONE: Record<FamilyFeedbackCampaignStatus, string> = {
	draft: 'bg-secondary text-muted-foreground',
	scheduled: 'bg-highlight/15 text-foreground',
	open: 'bg-accent/20 text-foreground',
	closed: 'bg-muted text-muted-foreground',
	published: 'bg-accent/20 text-foreground',
	archived: 'bg-muted text-muted-foreground',
	cancelled: 'bg-destructive/10 text-destructive',
};

export function toFamilyFeedbackIso(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	if (!trimmed) {
		return undefined;
	}
	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function toDatetimeLocalValue(value: string | undefined): string {
	if (!value) {
		return '';
	}
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return '';
	}
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
