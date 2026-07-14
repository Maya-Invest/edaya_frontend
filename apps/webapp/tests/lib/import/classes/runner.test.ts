import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedClassImportRow } from '$lib/import/classes/types';

mock.module('$lib/import/classes/notify-classes-list-changed', () => ({
	notifyClassesListChanged: mock(async () => {}),
}));

const { runClassImport } = await import('$lib/import/classes/runner');

function row(overrides: Partial<ValidatedClassImportRow> & Pick<ValidatedClassImportRow, 'rowIndex'>): ValidatedClassImportRow {
	return {
		nom: '6ème B',
		niveau: '6ème',
		gradeLevelId: 'gl-6',
		...overrides,
	};
}

describe('class import runner', () => {
	it('creates each valid row sequentially', async () => {
		const createClassGroup = mock(async () => {});
		const progress: Array<{ current: number; total: number }> = [];

		const result = await runClassImport({
			schoolId: 'school-1',
			academicYearId: '2026',
			client: {
				commands: {
					createClassGroup,
				},
			} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, nom: '6ème C' }),
			],
			existingClassIds: ['6a'],
			siblingCountByGrade: { 'gl-6': 1 },
			onProgress: (current, total) => {
				progress.push({ current, total });
			},
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(result.classIds).toEqual(['6b', '6c']);
		expect(createClassGroup).toHaveBeenCalledTimes(2);
		expect(createClassGroup).toHaveBeenNthCalledWith(1, expect.objectContaining({
			id: '6b',
			name: '6ème B',
			gradeLevelId: 'gl-6',
			academicYearId: '2026',
		}));
		expect(progress.at(-1)).toEqual({ current: 2, total: 2 });
	});

	it('continues after a row failure and reports partial success', async () => {
		const createClassGroup = mock(async (payload: { name: string }) => {
			if (payload.name === '6ème C') {
				throw new Error('Class conflict');
			}
		});

		const result = await runClassImport({
			schoolId: 'school-1',
			academicYearId: '2026',
			client: {
				commands: {
					createClassGroup,
				},
			} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, nom: '6ème C' }),
			],
			existingClassIds: ['6a'],
			siblingCountByGrade: { 'gl-6': 1 },
		});

		expect(result.created).toBe(1);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0]?.rowIndex).toBe(3);
		expect(result.failed[0]?.message).toContain('Class conflict');
	});
});
