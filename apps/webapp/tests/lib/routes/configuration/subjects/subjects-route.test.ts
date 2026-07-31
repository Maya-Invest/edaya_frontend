import { describe, expect, it } from 'bun:test';
import {
	activeSubjectsDetailTab,
	SUBJECTS_DETAIL_TABS,
} from '../../../../../src/routes/(app)/configuration/subjects/lib/subjects-detail-tabs';
import {
	chapterProgressFromEntries,
	emptySubjectsSlice,
	logEntriesForSubject,
	subjectIdFromUrl,
	subjectLevelLabelFromUrl,
} from '../../../../../src/routes/(app)/configuration/subjects/lib/subjects-helpers';

describe('subjects route helpers', () => {
	it('parses subject id from drawer URL', () => {
		const url = new URL('http://local/configuration/subjects/cs-math-6a/progression');
		expect(subjectIdFromUrl(url)).toBe('cs-math-6a');
	});

	it('ignores level segment when parsing subject id', () => {
		const url = new URL('http://local/configuration/subjects/level/6e');
		expect(subjectIdFromUrl(url)).toBeUndefined();
	});

	it('parses level label from level drawer URL', () => {
		const url = new URL('http://local/configuration/subjects/level/6%C3%A8me');
		expect(subjectLevelLabelFromUrl(url)).toBe('6ème');
	});

	it('returns an empty slice by default', () => {
		expect(emptySubjectsSlice()).toEqual({
			subjects: [],
			logEntries: [],
		});
	});

	it('filters log entries for a subject', () => {
		const entries = [
			{ id: '1', classId: '6a', subject: 'Math', chapter: 'A', progress: 50, date: '2026-01-01', teacher: '', content: '', notes: '' },
			{ id: '2', classId: '6b', subject: 'Math', chapter: 'B', progress: 70, date: '2026-01-02', teacher: '', content: '', notes: '' },
		];
		expect(logEntriesForSubject('Math', '6a', entries)).toHaveLength(1);
	});

	it('computes chapter progress from entries', () => {
		const entries = [
			{ id: '1', classId: '6a', subject: 'Math', chapter: 'A', progress: 40, date: '2026-01-01', teacher: '', content: '', notes: '' },
			{ id: '2', classId: '6a', subject: 'Math', chapter: 'A', progress: 60, date: '2026-01-02', teacher: '', content: '', notes: '' },
			{ id: '3', classId: '6a', subject: 'Math', chapter: 'B', progress: 80, date: '2026-01-03', teacher: '', content: '', notes: '' },
		];
		expect(chapterProgressFromEntries(entries)).toEqual({
			chapters: [['A', 60], ['B', 80]],
			overall: 70,
		});
	});
});

describe('subjects detail tabs', () => {
	it('exposes progression and logbook tabs', () => {
		expect(SUBJECTS_DETAIL_TABS.map(tab => tab.key)).toEqual(['progression', 'logbook']);
	});

	it('defaults bare subject URL to progression', () => {
		expect(activeSubjectsDetailTab('/configuration/subjects/cs-math-6a', 'cs-math-6a')).toBe('progression');
	});

	it('detects logbook tab from pathname', () => {
		expect(activeSubjectsDetailTab('/configuration/subjects/cs-math-6a/logbook', 'cs-math-6a')).toBe('logbook');
	});
});
