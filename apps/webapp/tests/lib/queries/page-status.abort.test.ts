import { describe, expect, it } from 'bun:test';
import { resolvePageLoad } from '$lib/queries/page-status';

describe('resolvePageLoad abort', () => {
	it('does not seed when the request is aborted before commit', async () => {
		const controller = new AbortController();
		const seeded = { value: null as string | null };
		const pending = resolvePageLoad(
			new URL('http://local/classes/6a/evaluations'),
			{
				waitForShell: false,
				empty: () => ({}),
				hasItems: () => true,
				load: async (signal) => {
					await new Promise(resolve => setTimeout(resolve, 25));
					signal.throwIfAborted();
					seeded.value = 'A';
					return {};
				},
			},
			{ signal: controller.signal },
		);
		controller.abort();
		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
		expect(seeded.value).toBeNull();
	});

	it('keeps a later load when an earlier delayed load is aborted', async () => {
		const first = new AbortController();
		const second = new AbortController();
		const seeded = { value: null as string | null };

		const delayed = resolvePageLoad(
			new URL('http://local/school/students/a/attendance'),
			{
				waitForShell: false,
				empty: () => ({}),
				hasItems: () => true,
				load: async (signal) => {
					await new Promise(resolve => setTimeout(resolve, 40));
					signal.throwIfAborted();
					seeded.value = 'A';
					return {};
				},
			},
			{ signal: first.signal },
		);

		const current = resolvePageLoad(
			new URL('http://local/school/students/b/attendance'),
			{
				waitForShell: false,
				empty: () => ({}),
				hasItems: () => true,
				load: async (signal) => {
					signal.throwIfAborted();
					seeded.value = 'B';
					return {};
				},
			},
			{ signal: second.signal },
		);

		first.abort();
		await current;
		await expect(delayed).rejects.toMatchObject({ name: 'AbortError' });
		expect(seeded.value).toBe('B');
	});
});
