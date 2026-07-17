import type { Subject } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { seedSubjectsCollection } from '$lib/detail-data/seed-policies';
import { resolvePageLoad } from '$lib/queries/page-status';

const classId = '6a';

function subject(id: string): Subject {
	return {
		id,
		classId,
		name: `Subject ${id}`,
		teacher: 'Teacher',
		hoursPerWeek: 4,
		color: 'mint',
		description: '',
		category: 'Scientifique',
	};
}

describe('query store actions', () => {
	it('resolvePageLoad seeds class-scoped subjects the same way queryClassSubjectsPage does', async () => {
		let store: Subject[] = [subject('existing-other-class')];
		store[0] = { ...subject('existing-other-class'), classId: '6b' };

		const loader = (url: URL) => resolvePageLoad(url, {
			empty: () => ({ classId }),
			load: async () => {
				const loaded = [subject('sub-math'), subject('sub-physics')];
				store = seedSubjectsCollection(store, loaded, { classId });
				return { classId };
			},
			hasItems: () => true,
		});

		const result = await loader(new URL(`https://school.test/classes/${classId}/subjects`));

		expect(result.classId).toBe(classId);
		expect(result.status).toBe('ready');
		expect(store.filter(entry => entry.classId === classId).map(entry => entry.id)).toEqual([
			'sub-math',
			'sub-physics',
		]);
		expect(store.filter(entry => entry.classId === '6b').map(entry => entry.id)).toEqual(['existing-other-class']);
	});

	it('resolvePageLoad returns empty status when demo=empty is set', async () => {
		const loader = (url: URL) => resolvePageLoad(url, {
			empty: () => ({ classId }),
			load: async () => ({ classId }),
			hasItems: () => false,
		});

		const result = await loader(new URL(`https://school.test/classes/${classId}/subjects?demo=empty`));
		expect(result.status).toBe('empty');
	});
});
