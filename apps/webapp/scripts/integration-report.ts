import type { MatrixResult } from './qa-matrix-support';

export interface BlockerReport {
	module: string;
	endpoint: string;
	action: string;
	detail: string;
	screenshot?: string;
	status: 'needs_discussion' | 'blocked';
	source?: 'setup' | 'matrix';
}

export const INTEGRATION_POLICY = 'report-only-no-frontend-fixes';

export function classifyActionType(action: string): 'list' | 'create' | 'update' | 'delete' | 'navigate' | 'other' {
	if (/supprimer|delete/i.test(action)) return 'delete';
	if (/créer|crud|nouveau|ajouter/i.test(action)) return 'create';
	if (/éditer|édi|modifier|sauver|assigner|changer|commentaire|photo/i.test(action)) return 'update';
	if (/liste|affichage|chargement|ledger|hub|catalogue|consulter|vue |redirect/i.test(action)) return 'list';
	if (/redirect|navigation|onglet|drawer/i.test(action)) return 'navigate';
	return 'other';
}

export function toBlockers(results: MatrixResult[]): BlockerReport[] {
	return results
		.filter(r => r.statut === 'NOT OK')
		.map(r => ({
			module: r.module,
			endpoint: r.endpoint,
			action: r.action,
			detail: r.detail ?? 'No detail',
			status: 'needs_discussion' as const,
			source: 'matrix' as const,
		}));
}

export function countByActionType(results: MatrixResult[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const row of results) {
		const type = classifyActionType(row.action);
		counts[type] = (counts[type] ?? 0) + 1;
	}
	return counts;
}

export function printBlockers(blockers: BlockerReport[]): void {
	if (blockers.length === 0) {
		return;
	}

	const blocked = blockers.filter(b => b.status === 'blocked');
	const needsDiscussion = blockers.filter(b => b.status === 'needs_discussion');

	if (blocked.length > 0) {
		console.log('\n--- Blocked (known product issues — skipped) ---');
		for (const b of blocked) {
			console.log(`⊘ [${b.module}] ${b.action.slice(0, 60)} — ${b.detail.slice(0, 100)}`);
		}
		console.log(`Total blocked: ${blocked.length}`);
	}

	if (needsDiscussion.length > 0) {
		console.log('\n--- Blockers (NOT OK — no frontend changes; discuss in summary) ---');
		for (const b of needsDiscussion) {
			console.log(`✗ [${b.module}] ${b.action.slice(0, 60)} — ${b.detail.slice(0, 100)}`);
		}
		console.log(`Total blockers: ${needsDiscussion.length}`);
	}

	console.log('See: .integration-run/summary.json → blockers[]');
}
