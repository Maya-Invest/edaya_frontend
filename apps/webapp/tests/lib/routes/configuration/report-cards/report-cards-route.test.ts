import { describe, expect, it } from 'bun:test';
import { legacyReportCardsHref, reportCardDefinitionIdFromUrl, reportCardsForScope } from '../../../../../src/routes/(app)/configuration/structure/details/report-cards/lib/report-cards-helpers';

describe('report-cards route helpers', () => {
	it('parses definition id from drawer URL', () => {
		const url = new URL('http://local/configuration/structure/details/report-cards/rcd-1');
		expect(reportCardDefinitionIdFromUrl(url)).toBe('rcd-1');
	});
});


describe('level report templates', () => {
	it('retains modal/filter context in legacy links and routes the list into Details', () => {
		expect(legacyReportCardsHref(new URL('http://local/configuration/report-cards/rcd-1?modal=edit&modalTarget=section&q=term'))).toBe('/configuration/structure/details/report-cards/rcd-1?modal=edit&modalTarget=section&q=term');
		expect(legacyReportCardsHref(new URL('http://local/configuration/report-cards?modal=create'))).toBe('/configuration/structure/details?modal=create');
	});
	it('includes multiple templates only for the chosen level and year', () => {
		const base = { schoolId: 'school', name: 'Template', gradeScaleId: 'scale', status: 'draft' as const, sections: [] };
		const definitions = [
			{ ...base, id: 'one', gradeLevelId: 'six', academicYearId: 'current' },
			{ ...base, id: 'two', gradeLevelId: 'six', academicYearId: 'current' },
			{ ...base, id: 'other-level', gradeLevelId: 'five', academicYearId: 'current' },
			{ ...base, id: 'previous-year', gradeLevelId: 'six', academicYearId: 'previous' },
		];
		expect(reportCardsForScope(definitions, 'six', 'current').map(row => row.id)).toEqual(['one', 'two']);
		expect(reportCardsForScope(definitions, 'six', 'empty')).toEqual([]);
	});
});
