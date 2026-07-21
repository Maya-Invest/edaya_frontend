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
		targets: [{
			classSubjectId: 'cs-6a-math',
			subjectId: 'subj-math-6a',
			classGroupId: 'class-6a',
			gradeLevelId: 'gl-6',
			gradeLevelName: '6ème',
			subjectName: 'Mathématiques',
			className: '6ème A',
		}],
		...overrides,
	};
}

describe('chapter import runner', () => {
	it('creates each target via configureSubjectMatter', async () => {
		const configureSubjectMatter = mock(async () => ({}));

		const result = await runChapterImport({
			seed: 'testseed',
			client: {
				commands: {
					configureSubjectMatter,
				},
			} as never,
			rows: [
				row({ rowIndex: 2, description: 'Intro' }),
			],
		});

		expect(result.created).toBe(1);
		expect(configureSubjectMatter).toHaveBeenCalledWith(expect.objectContaining({
			subjectId: 'subj-math-6a',
			name: 'Les fractions',
			description: 'Intro',
			sequenceOrder: 1,
		}));
	});
});
