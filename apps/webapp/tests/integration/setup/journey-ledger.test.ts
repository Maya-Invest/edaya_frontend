import type { QaTemplateRow } from '../../../scripts/qa-template-matrix.manual';
import type { UiJourney } from './journey-context';
import { describe, expect, it } from 'bun:test';
import {
	MODAL_DEEP_LINK_ACTION_PREFIX,
	ROUTE_SMOKE_ACTION,
	sidebarLinkAction,
} from '../../../scripts/qa-route-catalog';
import { coverCompletedModal, coverMutationActions } from './journey-context';
import { JourneyLedger } from './journey-ledger';

const TIMETABLE = 'http://localhost:5173/classes/[classId]/timetable';
const STAFF_PROFILE = 'http://localhost:5173/school/staff/[id]/profile';

const matrix: QaTemplateRow[] = [
	{ module: 'Classes', endpoint: TIMETABLE, action: ROUTE_SMOKE_ACTION },
	{ module: 'Classes', endpoint: TIMETABLE, action: sidebarLinkAction('tab.timetable') },
	{ module: 'Classes', endpoint: TIMETABLE, action: 'Vue semaine / liste' },
	{
		module: 'École',
		endpoint: `${STAFF_PROFILE}?modal=edit-profile`,
		action: `${MODAL_DEEP_LINK_ACTION_PREFIX}edit-profile`,
	},
	{ module: 'École', endpoint: STAFF_PROFILE, action: 'Éditer profil' },
];

function journey(): UiJourney {
	return {
		ledger: new JourneyLedger(matrix),
		onRecord() {},
	} as unknown as UiJourney;
}

describe('JourneyLedger.coverVisit', () => {
	it('records direct navigation without claiming sidebar-link rows', () => {
		const ledger = new JourneyLedger(matrix);
		const recorded = ledger.coverVisit('/classes/[classId]/timetable', 'NOT OK', 'shell timeout');

		expect(recorded.map(row => row.action)).toEqual([ROUTE_SMOKE_ACTION]);
		expect(ledger.unclaimed(matrix).map(row => row.action)).toEqual([
			sidebarLinkAction('tab.timetable'),
			'Vue semaine / liste',
			`${MODAL_DEEP_LINK_ACTION_PREFIX}edit-profile`,
			'Éditer profil',
		]);
	});
});

describe('mutation coverage', () => {
	it('does not mark a closed modal OK when the postcondition is omitted', () => {
		const current = journey();
		coverCompletedModal(current, '/school/staff/[id]/profile', 'edit-profile', {
			opened: true,
			submitted: true,
			closed: true,
		});
		expect(current.ledger.results()).toEqual([
			expect.objectContaining({ action: `${MODAL_DEEP_LINK_ACTION_PREFIX}edit-profile`, statut: 'NOT OK' }),
		]);
	});

	it('marks an unexercised mutation N/A', () => {
		const current = journey();
		coverMutationActions(
			current,
			STAFF_PROFILE,
			['Éditer profil'],
			{ exercised: false },
			'profile visited; edit not submitted',
		);
		expect(current.ledger.results()).toEqual([
			expect.objectContaining({
				action: 'Éditer profil',
				statut: 'N/A',
				detail: 'profile visited; edit not submitted',
			}),
		]);
	});

	it('marks an exercised mutation OK only when the postcondition passed', () => {
		const current = journey();
		coverMutationActions(current, STAFF_PROFILE, ['Éditer profil'], {
			exercised: true,
			postcondition: true,
		});
		expect(current.ledger.results()[0]?.statut).toBe('OK');
	});
});
