import type { components } from '$lib/api/schema';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { SvelteSet } from 'svelte/reactivity';

export class PermissionResolutionPreviewState {
	labels = $state<Record<number, string>>({});
	private version = 0;

	async load(report: components['schemas']['PermissionResolutionReport']) {
		const version = ++this.version;
		this.labels = {};
		const labels: Record<number, string> = {};
		const client = getBrowserSchoolClient();
		const years = [...new SvelteSet(report.changes.map(change => change.academicYearId))];
		for (const academicYearId of years) {
			const items = report.changes.flatMap((change, index) => change.academicYearId === academicYearId
				? [
						...(change.beforeScopes.length ? [{ index, side: 'before', permission: change.permission, scopes: change.beforeScopes }] : []),
						...(change.afterScopes.length ? [{ index, side: 'after', permission: change.permission, scopes: change.afterScopes }] : []),
					]
				: []);
			const rendered: Record<string, string> = {};
			for (let offset = 0; offset < items.length; offset += 40) {
				const chunk = items.slice(offset, offset + 40);
				try {
					const result = await client.authorization.scopeRender({ academicYearId, items: chunk.map(({ permission, scopes }) => ({ permission, scopes })) });
					for (const [position, item] of chunk.entries()) rendered[`${item.index}:${item.side}`] = result.items[position]?.scopes.map(scope => scope.label).join('; ') ?? '—';
				}
				catch {
					for (const item of chunk) rendered[`${item.index}:${item.side}`] = '—';
				}
			}
			for (const [index, change] of report.changes.entries()) {
				if (change.academicYearId !== academicYearId)
					continue;
				labels[index] = change.change === 'changed'
					? `${rendered[`${index}:before`]} → ${rendered[`${index}:after`]}`
					: rendered[`${index}:${change.change === 'removed' ? 'before' : 'after'}`];
			}
		}
		if (version === this.version)
			this.labels = labels;
	}

	cancel() {
		this.version += 1;
	}
}
