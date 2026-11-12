import { expect, mock, test } from 'bun:test';

const createCatalogService = mock(async (_input: unknown) => ({}));
const updateCatalogService = mock(async (_input: unknown) => ({}));
const configureSubject = mock(async (_input: unknown) => ({}));
const client = { commands: { configureSubject, createCatalogService, updateCatalogService }, entities: { classGroups: { get: async () => ({ gradeLevelId: 'grade', academicYearId: 'year' }) } } };
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => client }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { schoolId: 'school', school: { financeCurrency: 'XOF' } } }));
mock.module('$lib/academic/context.svelte', () => ({ academicContext: { yearId: 'year' } }));
mock.module('$lib/api/mutations/run-mutation', () => ({ runMutation: async (run: () => Promise<unknown>) => run() }));
const { createSubjectForClassMutation, createSubjectForGradeLevelMutation } = await import('$lib/api/mutations/subject.mutations');

for (const path of ['class', 'grade'] as const) {
	test(`${path} subject creation sends the discipline and optional form fields to the API`, async () => {
		configureSubject.mockClear();
		const input = { name: 'Custom subject', disciplineId: 'discipline', coefficient: 2.5, shortName: 'CS', isOptional: false, categoryId: 'category', color: 'mint' as const };
		const result = path === 'class'
			? await createSubjectForClassMutation({ ...input, classGroupId: 'class' })
			: await createSubjectForGradeLevelMutation({ ...input, gradeLevelId: 'grade', academicYearId: 'year', classGroupIds: ['class'] });
		expect(result).not.toBeNull();
		expect(configureSubject).toHaveBeenCalledTimes(1);
		expect(configureSubject.mock.calls[0]?.[0]).toMatchObject({ ...input, gradeLevelId: 'grade', academicYearId: 'year' });
	});
}

const { createCatalogServiceMutation, updateCatalogServiceMutation } = await import('$lib/api/mutations/billing.mutations');
test('an empty description is omitted on fee creation, while an edit can explicitly clear it', async () => {
	await createCatalogServiceMutation({ name: 'Tuition', description: null, category: 'tuition', amount: 10000 });
	const created = JSON.parse(JSON.stringify(createCatalogService.mock.calls[0]?.[0]));
	expect(created).not.toHaveProperty('description');
	expect(created.defaultPrice).toBe(10000);
	await updateCatalogServiceMutation({ id: 'fee', description: null });
	expect(updateCatalogService.mock.calls[0]?.[0]).toMatchObject({ id: 'fee', description: null });
});
