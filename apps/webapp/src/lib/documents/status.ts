import type { DocumentIssuanceStatus } from '$lib/api/documents-types';

export const issuanceStatusTone: Record<DocumentIssuanceStatus, string> = {
	requested: 'bg-secondary text-muted-foreground',
	rendering: 'bg-highlight-soft text-highlight',
	ready: 'bg-accent/15 text-foreground',
	failed: 'bg-destructive/10 text-destructive',
	superseded: 'bg-muted text-muted-foreground',
	voided: 'bg-muted text-muted-foreground',
	preview: 'bg-secondary text-muted-foreground',
};

export function isDownloadableStatus(status: DocumentIssuanceStatus): boolean {
	return status === 'ready' || status === 'preview';
}

export function isRetryableStatus(status: DocumentIssuanceStatus): boolean {
	return status === 'failed';
}
