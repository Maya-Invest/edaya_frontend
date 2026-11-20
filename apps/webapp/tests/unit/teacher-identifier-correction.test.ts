import { plugin } from 'bun';
import { expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';
import { readable } from 'svelte/store';

plugin({
	name: 'teacher-identifier-correction-runes',
	setup(build) {
		build.onLoad({ filter: /identifier-correction-state\.svelte\.ts$/ }, async ({ path }) => {
			const source = new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text());
			return { contents: compileModule(source, { filename: path, generate: 'client' }).js.code, loader: 'js' };
		});
	},
});

const correct = mock(async (input: { entityId: string; identifier: string }) => ({ id: input.entityId, identifier: input.identifier }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => ({ commands: { correctHumanIdentifier: correct } }) }));
mock.module('$lib/api/mutations/run-mutation', () => ({ runMutation: (write: () => Promise<unknown>) => write() }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: { schoolId: 'school', authUserId: 'owner', userId: 'staff' } }));
mock.module('$lib/i18n', () => ({ t: readable((key: string) => key) }));

const { mapTeacher } = await import('../../src/lib/api/teachers-data');
const { personFieldDraft } = await import('../../src/lib/people-profile-fields');
const { IdentifierCorrectionState } = await import('../../src/lib/smart-components/human-identifier/identifier-correction-state.svelte');

test('a teacher with no identifier can be assigned their first one from the profile editor', async () => {
	const teacher = mapTeacher({ id: 'internal-teacher-id', schoolId: 'school', firstName: 'Ada', lastName: 'Jones', isActive: true });
	const draft = personFieldDraft('teacher', teacher);
	const correction = new IdentifierCorrectionState(() => ({
		kind: 'teacher', entityId: teacher.id, identifier: draft.identifier ?? '', onCorrected: value => { draft.identifier = value; },
	}));

	correction.begin();
	expect(correction.expected).toBe('');
	correction.proposed = '  tc-001 ';
	expect(correction.valid).toBe(true);
	await correction.submit();

	expect(correct.mock.calls[0]?.[0]).toMatchObject({ group: 'teachers', entityId: teacher.id, expectedIdentifier: null, identifier: 'TC-001' });
	expect(draft.identifier).toBe('TC-001');
});
