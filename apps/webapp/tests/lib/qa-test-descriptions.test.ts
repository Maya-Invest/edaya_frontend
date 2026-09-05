import { describe, expect, test } from 'bun:test';
import { describeTestExactly } from '../../scripts/qa-test-descriptions';

const studentsList = {
	module: 'École' as const,
	endpoint: 'http://localhost:5173/school/students',
};

describe('describeTestExactly sort / pagination / week', () => {
	test('Tri colonnes describes only column sort, not load-more or week nav', () => {
		const steps = describeTestExactly({ ...studentsList, action: 'Tri colonnes' });
		expect(steps.toLowerCase()).toContain('sortable column');
		expect(steps.toLowerCase()).toContain('list-sort');
		expect(steps.toLowerCase()).not.toContain('load more');
		expect(steps.toLowerCase()).not.toContain('week nav');
	});

	test('Pagination / charger plus does not mention column sort', () => {
		const steps = describeTestExactly({ ...studentsList, action: 'Pagination / charger plus' });
		expect(steps.toLowerCase()).toContain('pagination');
		expect(steps.toLowerCase()).not.toContain('list-sort');
		expect(steps.toLowerCase()).not.toContain('week');
	});

	test('Navigation semaine describes week controls only', () => {
		const steps = describeTestExactly({
			module: 'Classes',
			endpoint: 'http://localhost:5173/classes/[classId]/timetable',
			action: 'Navigation semaine',
		});
		expect(steps.toLowerCase()).toContain('week');
		expect(steps.toLowerCase()).not.toContain('list-sort');
		expect(steps.toLowerCase()).not.toContain('load more');
	});

	test('Retirer destinataire is visibility-only and does not mention mutation', () => {
		const steps = describeTestExactly({
			module: 'École',
			endpoint: 'http://localhost:5173/school/announcements/[id]',
			action: 'Retirer destinataire',
		});
		expect(steps.toLowerCase()).toContain('remove recipient');
		expect(steps.toLowerCase()).toContain('must not mutate');
		expect(steps.toLowerCase()).not.toContain('confirm dialog if opened');
	});

	test('CRUD années scolaires fills dates, not a free-text name', () => {
		const steps = describeTestExactly({
			module: 'Configuration',
			endpoint: 'http://localhost:5173/configuration/academic',
			action: 'CRUD années scolaires',
		});
		expect(steps.toLowerCase()).toContain('start/end dates');
		expect(steps.toLowerCase()).toContain('no name field');
		expect(steps.toLowerCase()).toContain('yyyy-yyyy');
	});
});
