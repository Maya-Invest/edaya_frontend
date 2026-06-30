<script lang="ts">
	import type { HierarchyGroup } from '$lib/types/school';
	import { page } from '$app/stores';
	import { appGoto, classItemHref } from '$lib/navigation/app-navigation';

	const { hierarchy }: { hierarchy: HierarchyGroup[] } = $props();

	const classId = $derived($page.params.classId ?? '6a');
	const currentSegment = $derived($page.url.pathname.split('/')[3] ?? 'students');

	function onChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		appGoto(classItemHref(target.value, currentSegment));
	}
</script>

<select
	value={classId}
	onchange={onChange}
	class="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
	{#each hierarchy as g (g.level)}
		<optgroup label={g.level}>
			{#each g.classes as c (c.id)}
				<option value={c.id}>{c.name} · {c.studentCount}</option>
			{/each}
		</optgroup>
	{/each}
</select>
