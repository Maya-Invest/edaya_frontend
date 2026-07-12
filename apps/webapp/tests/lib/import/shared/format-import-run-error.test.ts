import { describe, expect, it } from 'bun:test';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';

const translate = (key: string, params?: Record<string, string | number>) => {
	if (key === 'import.runErrors.classCapacityReached') {
		return `La classe ${params?.class} a atteint sa capacité maximale.`;
	}
	if (key === 'import.runErrors.generic') {
		return 'La requête a échoué.';
	}
	return key;
};

describe('formatImportRunErrorMessage', () => {
	it('maps class capacity errors to a readable class label from the import row', () => {
		const message = formatImportRunErrorMessage(
			new Error('Class group ci-6a has reached capacity'),
			{
				entityLabel: '6ème A',
				classGroupId: 'ci-6a',
			},
			translate,
		);

		expect(message).toBe('La classe 6ème A a atteint sa capacité maximale.');
	});

	it('falls back to the class name map when the row label is missing', () => {
		const message = formatImportRunErrorMessage(
			new Error('Class group ci-6b has reached capacity'),
			{
				classNameById: new Map([['ci-6b', '6ème B']]),
			},
			translate,
		);

		expect(message).toBe('La classe 6ème B a atteint sa capacité maximale.');
	});

	it('substitutes class ids in unknown api messages', () => {
		const message = formatImportRunErrorMessage(
			new Error('Cannot enroll student into ci-6a'),
			{
				classNameById: new Map([['ci-6a', '6ème A']]),
			},
			translate,
		);

		expect(message).toBe('Cannot enroll student into 6ème A');
	});
});
