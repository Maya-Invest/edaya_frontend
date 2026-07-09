<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import Input from '$lib/components/ui/input/input.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { relationKey } from '../shared/drawer-constants.ts';
	import DrawerField from '../shared/DrawerField.svelte';

	const { g }: { g: Guardian } = $props();

	const linked = $derived(detailDataContext.students.filter(s => g.studentIds.includes(s.id)));
</script>

<div class="space-y-5">
	<div class="flex items-center gap-4">
		<div
			class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-lg font-semibold text-primary-foreground"
		>
			{g.initials}
		</div>
		<div>
			<h3 class="font-display text-2xl font-semibold leading-tight">{g.name}</h3>
			<p class="text-sm text-muted-foreground">
				{$t('guardian.prefers', {
					rel: $t(relationKey[g.relation]),
					contact: $t(`guardian.contact.${g.preferredContact}`),
				})}
			</p>
		</div>
	</div>
	<DrawerField label={$t('guardian.fullName')}>
		<Input value={g.name} />
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('common.email')}>
			<Input value={g.email} />
		</DrawerField>
		<DrawerField label={$t('common.phone')}>
			<Input value={g.phone} />
		</DrawerField>
	</div>
	<DrawerField label={$t('guardian.linkedStudents')}>
		<div class="space-y-2">
			{#each linked as s (s.id)}
				<div class="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
					<div
						class="flex h-7 w-7 items-center justify-center rounded-md bg-primary font-display text-[10px] font-semibold text-primary-foreground"
					>
						{s.initials}
					</div>
					<span class="text-sm">{s.name}</span>
					<span class="ml-auto font-mono text-[10px] uppercase text-muted-foreground">{s.classId}</span>
				</div>
			{/each}
		</div>
	</DrawerField>
</div>
