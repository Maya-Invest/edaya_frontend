import { describe, expect, it } from 'bun:test';
import {
	resolveLegacySubjectGradeLevelId,
	subjectLevelCompatibilityHref,
} from '../../../../../src/routes/(app)/configuration/structure/subjects/lib/subject-level-redirect';
import {
	activeSubjectsDetailTab,
	SUBJECTS_DETAIL_TABS,
} from '../../../../../src/routes/(app)/configuration/structure/subjects/lib/subjects-detail-tabs';
import {
	logEntriesForSubject,
	subjectIdFromUrl,
	subjectProgress,
} from '../../../../../src/routes/(app)/configuration/structure/subjects/lib/subjects-helpers';

describe('subjects route helpers', () => {
	it('parses subject id from drawer URL', () => {
		const url = new URL('http://local/configuration/structure/subjects/cs-math-6a/progression');
		expect(subjectIdFromUrl(url)).toBe('cs-math-6a');
	});

	it('ignores level segment when parsing subject id', () => {
		const url = new URL('http://local/configuration/structure/subjects/level/6e');
		expect(subjectIdFromUrl(url)).toBeUndefined();
	});

	it('redirects a legacy level label to the stable grade-level filter', () => {
		const url = new URL(
			'http://local/configuration/structure/subjects/level/Sixi%C3%A8me?q=math&modal=create-subject&gradeLevel=stale',
		);
		const gradeLevels = [
			{ id: 'ci-gl-6', name: 'Sixième' },
			{ id: 'ci-gl-5', name: 'Cinquième' },
		];
		expect(resolveLegacySubjectGradeLevelId('Sixi%C3%A8me', gradeLevels)).toBe('ci-gl-6');
		expect(subjectLevelCompatibilityHref(url, 'Sixième', gradeLevels)).toBe(
			'/configuration/structure/subjects?q=math&gradeLevel=ci-gl-6',
		);
	});

	it('falls back to the subjects list when the legacy level does not resolve', () => {
		const url = new URL(
			'http://local/configuration/structure/subjects/level/Inconnu?q=fran%C3%A7ais&modal=edit&modalTarget=secret',
		);
		expect(subjectLevelCompatibilityHref(url, 'Inconnu', [{ id: 'ci-gl-6', name: 'Sixième' }]))
			.toBe('/configuration/structure/subjects?q=fran%C3%A7ais');
	});

	it('filters log entries for a subject', () => {
		const entries = [
			{ id: '1', classId: '6a', subject: 'Math', chapter: 'A', progress: 50, date: '2026-01-01', teacher: '', content: '', notes: '' },
			{ id: '2', classId: '6b', subject: 'Math', chapter: 'B', progress: 70, date: '2026-01-02', teacher: '', content: '', notes: '' },
		];
		expect(logEntriesForSubject('Math', '6a', entries)).toHaveLength(1);
	});

	it('reads weighted coverage even when lesson history is empty', () => {
		expect(subjectProgress({ completedPercentage: 63 } as Parameters<typeof subjectProgress>[0], [])).toBe(63);
	});
});

describe('subjects detail tabs', () => {
	it('exposes progression and logbook tabs', () => {
		expect(SUBJECTS_DETAIL_TABS.map(tab => tab.key)).toEqual(['progression', 'logbook']);
	});

	it('defaults bare subject URL to progression', () => {
		expect(activeSubjectsDetailTab('/configuration/structure/subjects/cs-math-6a', 'cs-math-6a')).toBe('progression');
	});

	it('detects logbook tab from pathname', () => {
		expect(activeSubjectsDetailTab('/configuration/structure/subjects/cs-math-6a/logbook', 'cs-math-6a')).toBe('logbook');
	});
});
