import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
import type { ReportCardDefinition } from '$lib/types/report-cards';
import { readReportCardDefinitionListFilters, writeReportCardDefinitionListFilters } from '$lib/list/list-url-filters';
import { enabledChannelsForTemplateKey } from '$lib/notification-templates/catalog';
import { describe, expect, it } from 'bun:test';
import { matchesNotificationTemplate, notificationListFilters } from '../../../src/routes/(app)/configuration/notifications/lib/notifications-list-filters';
import { filterReportCardDefinitions, reportCardsForScope } from '../../../src/routes/(app)/configuration/structure/details/report-cards/lib/report-cards-helpers';

describe('complete configuration collection matching', () => {
	it('combines level/year, description, publication and default filters without classifying unknown as false', () => {
		const base = { schoolId: 'school', name: 'Model', gradeScaleId: 'scale', gradeLevelId: 'level', academicYearId: 'year', status: 'published' as const, sections: [] };
		const definitions: ReportCardDefinition[] = [
			{ ...base, id: 'default', description: 'Term summary', isDefault: true },
			{ ...base, id: 'other', description: 'TERM summary', isDefault: false },
			{ ...base, id: 'unknown', description: 'Term summary' },
			{ ...base, id: 'old', academicYearId: 'old', isDefault: false },
		];
		const scope = reportCardsForScope(definitions, 'level', 'year');
		expect(filterReportCardDefinitions(scope, { q: 'term', status: 'published', defaultModel: 'no' }).map(row => row.id)).toEqual(['other']);
		expect(filterReportCardDefinitions(scope, { q: '', status: 'all', defaultModel: 'all' })).toHaveLength(3);
		expect(filterReportCardDefinitions(scope, { q: '', status: 'draft', defaultModel: 'all' })).toEqual([]);
	});

	it('resets model facets while preserving search, selected level, drawer and modal context', () => {
		const url = new URL('http://local/configuration/structure/details/report-cards/one?gradeLevel=level&q=term&status=published&defaultModel=yes&modal=edit');
		const reset = writeReportCardDefinitionListFilters(url, { ...readReportCardDefinitionListFilters(url), status: 'all', defaultModel: 'all' });
		expect(reset).toBe('/configuration/structure/details/report-cards/one?gradeLevel=level&q=term&modal=edit');
		expect(readReportCardDefinitionListFilters(new URL('http://local/?status=unknown&defaultModel=unknown'))).toEqual({ q: '', status: 'all', defaultModel: 'all' });
	});

	it('matches enabled channels, not merely supported channels, and never assumes settings for a missing document', () => {
		const document = { announcementPublished: { enable_email: false, enable_push: true, enable_sms: false } } as SchoolNotificationTemplatesRow;
		expect(enabledChannelsForTemplateKey(document, 'announcement.published')).toEqual(['in_app', 'push']);
		expect(matchesNotificationTemplate('announcement.published', 'Annonce publiée', document, { q: 'ANNONCE', channel: 'push' })).toBe(true);
		expect(matchesNotificationTemplate('announcement.published', 'Annonce publiée', document, { q: '', channel: 'email' })).toBe(false);
		expect(enabledChannelsForTemplateKey(null, 'announcement.published')).toBeNull();
		expect(matchesNotificationTemplate('announcement.published', 'Annonce', null, { q: '', channel: 'push' })).toBe(false);
	});

	it('retains template detail and search when channel filters reset', () => {
		const url = new URL('http://local/configuration/notifications/announcement.published?q=annonce&channel=push');
		expect(notificationListFilters.write(url, { ...notificationListFilters.read(url), channel: 'all' })).toBe('/configuration/notifications/announcement.published?q=annonce');
		expect(notificationListFilters.read(new URL('http://local/?channel=unsupported'))).toEqual({ q: '', channel: 'all' });
	});
});
