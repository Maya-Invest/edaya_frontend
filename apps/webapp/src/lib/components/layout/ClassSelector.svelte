<script lang="ts">
	import type { HierarchyGroup } from '$lib/types/school';
	import { page } from '$app/stores';
	import { classLabelForId, resolveActiveClassId } from '$lib/academic/class-selection';
	import { academicContext } from '$lib/academic/context.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { appGoto, classItemHref } from '$lib/navigation/app-navigation';

	const { hierarchy }: { hierarchy: HierarchyGroup[] } = $props();

	const classId = $derived(resolveActiveClassId($page.params.classId, academicContext.classes));
	const currentSegment = $derived($page.url.pathname.split('/')[3] ?? 'students');
	const selectedClassLabel = $derived(classLabelForId(classId, academicContext.classes));

	function onValueChange(value: string) {
		if (value) {
			appGoto(classItemHref(value, currentSegment));
		}
	}
</script>

<Select.Root type="single" value={classId} onValueChange={onValueChange}>
	<Select.Trigger class="h-9 w-full rounded-lg">
		<Select.Value placeholder={$t('roles.selectClassGroup')}>
			{selectedClassLabel || $t('roles.selectClassGroup')}
		</Select.Value>
	</Select.Trigger>
	<Select.Content class="z-[100]">
		{#if hierarchy.length === 0}
			<p class="px-2 py-1.5 text-xs text-muted-foreground">{$t('roles.scopeNoClasses')}</p>
		{/if}
		{#each hierarchy as group (group.level)}
			<Select.Group>
				<Select.Label>{group.level}</Select.Label>
				{#each group.classes as classGroup (classGroup.id)}
					<Select.Item value={classGroup.id} label={classGroup.name}>
						{classGroup.name} · {classGroup.studentCount}
					</Select.Item>
				{/each}
			</Select.Group>
		{/each}
	</Select.Content>
</Select.Root>
