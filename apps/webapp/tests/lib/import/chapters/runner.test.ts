import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedChapterImportRow } from '$lib/import/chapters/types';

mock.module('$lib/subjects/notify-subjects-list-changed', () => ({
	notifySubjectsListChanged: mock(() => {}),
}));

const { runChapterImport } = await import('$lib/import/chapters/runner');

function row(overrides: Partial<ValidatedChapterImportRow> & Pick<ValidatedChapterImportRow, 'rowIndex'>): ValidatedChapterImportRow {
	return {
		niveau: '6ème',
		matiere: 'Mathématiques',
		titre: 'Les fractions',
		sequenceOrder: 1,
		target: {
			gradeLevelSubjectId: 'gls-6-math',
			subjectId: 'subj-math',
			gradeLevelId: 'gl-6',
			gradeLevelName: '6ème',
			subjectName: 'Mathématiques',
			classAssignments: [
				{ classGroupId: 'class-6a', classSubjectId: 'cs-6a-math' },
				{ classGroupId: 'class-6b', classSubjectId: 'cs-6b-math' },
			],
		},
		...overrides,
	};
}

describe('chapter import runner', () => {
	it('creates one chapter per row and syncs all classes via assignMatterToGradeLevelSubject', async () => {
		const configureSubjectMatter = mock(async () => ({}));
		const assignMatterToGradeLevelSubject = mock(async () => ({}));

		const result = await runChapterImport({
			seed: 'testseed',
			client: {
				commands: {
					configureSubjectMatter,
					assignMatterToGradeLevelSubject,
				},
			} as never,
			rows: [
				row({ rowIndex: 2, description: 'Intro' }),
			],
		});

		expect(result.created).toBe(1);
		expect(configureSubjectMatter).toHaveBeenCalledTimes(1);
		expect(assignMatterToGradeLevelSubject).toHaveBeenCalledTimes(1);
		expect(configureSubjectMatter).toHaveBeenCalledWith(expect.objectContaining({
			subjectId: 'subj-math',
			name: 'Les fractions',
			description: 'Intro',
			sequenceOrder: 1,
		}));
		expect(assignMatterToGradeLevelSubject).toHaveBeenCalledWith(expect.objectContaining({
			gradeLevelSubjectId: 'gls-6-math',
			classSubjectMatterIdsByClassGroupId: {
				'class-6a': 'csm-cs-6a-math-sm-testseed-0',
				'class-6b': 'csm-cs-6b-math-sm-testseed-0',
			},
		}));
	});
});
