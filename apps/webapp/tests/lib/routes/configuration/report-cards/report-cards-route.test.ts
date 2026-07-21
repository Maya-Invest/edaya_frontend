import { describe, expect, it } from 'bun:test';
import {
	emptyReportCardsSlice,
	reportCardDefinitionIdFromUrl,
} from '../../../../../src/routes/(app)/configuration/report-cards/lib/report-cards-helpers';

describe('report-cards route helpers', () => {
	it('parses definition id from drawer URL', () => {
		const url = new URL('http://local/configuration/report-cards/rcd-1');
		expect(reportCardDefinitionIdFromUrl(url)).toBe('rcd-1');
	});

	it('returns an empty slice by default', () => {
		expect(emptyReportCardsSlice()).toEqual({
			scales: [],
			definitions: [],
		});
	});
});
