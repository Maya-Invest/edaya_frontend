/**
 * Coverage ledger: journey steps record QA matrix rows as they happen.
 * Leftover unclaimed rows can still run once after the journey.
 */
import { rowKey } from '../../../scripts/qa-matrix-support';
import type { MatrixResult, MatrixStatut } from '../../../scripts/qa-matrix-support';
import type { QaTemplateRow } from '../../../scripts/qa-template-matrix.manual';
import {
	MODAL_DEEP_LINK_ACTION_PREFIX,
	ROUTE_SMOKE_ACTION,
} from '../../../scripts/qa-route-catalog';

export function normalizeMatrixPath(endpoint: string): string {
	if (endpoint === '(app)' || endpoint === '(multi-comptes)') {
		return endpoint;
	}
	const withoutHost = endpoint.replace(/^https?:\/\/[^/]+/i, '');
	return withoutHost.startsWith('/') ? withoutHost : `/${withoutHost}`;
}

export function pathWithoutQuery(endpoint: string): string {
	const path = normalizeMatrixPath(endpoint);
	const q = path.indexOf('?');
	return q >= 0 ? path.slice(0, q) : path;
}

export class JourneyLedger {
	private readonly byKey = new Map<string, MatrixResult>();

	constructor(private readonly matrix: readonly QaTemplateRow[]) {}

	has(row: QaTemplateRow): boolean {
		return this.byKey.has(rowKey(row));
	}

	results(): MatrixResult[] {
		return [...this.byKey.values()];
	}

	record(row: QaTemplateRow, statut: MatrixStatut, detail?: string): MatrixResult {
		const key = rowKey(row);
		const existing = this.byKey.get(key);
		if (existing) {
			return existing;
		}
		const result: MatrixResult = {
			module: row.module,
			endpoint: row.endpoint,
			action: row.action,
			statut,
			detail,
		};
		this.byKey.set(key, result);
		return result;
	}

	coverPath(
		templatePath: string,
		statut: MatrixStatut,
		detail?: string,
		actions?: readonly string[],
	): MatrixResult[] {
		const recorded: MatrixResult[] = [];
		const wanted = actions ? new Set(actions) : null;
		const template = templatePath.includes('?') || templatePath.startsWith('(')
			? templatePath
			: templatePath;

		for (const row of this.matrix) {
			const rowPath = normalizeMatrixPath(row.endpoint);
			if (rowPath !== template && pathWithoutQuery(row.endpoint) !== pathWithoutQuery(template)) {
				continue;
			}
			if (wanted && !wanted.has(row.action)) {
				continue;
			}
			if (this.has(row)) {
				continue;
			}
			recorded.push(this.record(row, statut, detail));
		}
		return recorded;
	}

	coverVisit(templatePath: string, statut: MatrixStatut, detail?: string): MatrixResult[] {
		const recorded: MatrixResult[] = [];
		const path = pathWithoutQuery(templatePath);
		for (const row of this.matrix) {
			if (pathWithoutQuery(row.endpoint) !== path) {
				continue;
			}
			const action = row.action;
			if (
				action === ROUTE_SMOKE_ACTION
				|| action === 'Liste'
				|| action.startsWith('Liste — affichage')
			) {
				if (this.has(row)) {
					continue;
				}
				recorded.push(this.record(row, statut, detail));
			}
		}
		return recorded;
	}

	coverModal(parentRoute: string, modal: string, statut: MatrixStatut, detail?: string): MatrixResult[] {
		const action = `${MODAL_DEEP_LINK_ACTION_PREFIX}${modal}`;
		const withQuery = parentRoute.includes('?')
			? parentRoute
			: `${parentRoute}?modal=${modal}`;
		return this.coverPath(withQuery, statut, detail, [action]);
	}

	unclaimed(matrix: readonly QaTemplateRow[]): QaTemplateRow[] {
		return matrix.filter(row => !this.has(row));
	}
}
