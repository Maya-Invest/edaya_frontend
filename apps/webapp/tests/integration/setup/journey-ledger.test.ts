import { describe, expect, it } from 'bun:test';
import {
	ROUTE_SMOKE_ACTION,
	sidebarLinkAction,
} from '../../../scripts/qa-route-catalog';
import type { QaTemplateRow } from '../../../scripts/qa-template-matrix.manual';
import { JourneyLedger } from './journey-ledger';

const TIMETABLE = 'http://localhost:5173/classes/[classId]/timetable';

const matrix: QaTemplateRow[] = [
	{ module: 'Classes', endpoint: TIMETABLE, action: ROUTE_SMOKE_ACTION },
	{ module: 'Classes', endpoint: TIMETABLE, action: sidebarLinkAction('tab.timetable') },
	{ module: 'Classes', endpoint: TIMETABLE, action: 'Vue semaine / liste' },
];

describe('JourneyLedger.coverVisit', () => {
	it('records direct navigation without claiming sidebar-link rows', () => {
		const ledger = new JourneyLedger(matrix);
		const recorded = ledger.coverVisit('/classes/[classId]/timetable', 'NOT OK', 'shell timeout');

		expect(recorded.map(row => row.action)).toEqual([ROUTE_SMOKE_ACTION]);
		expect(ledger.unclaimed(matrix).map(row => row.action)).toEqual([
			sidebarLinkAction('tab.timetable'),
			'Vue semaine / liste',
		]);
	});
});
