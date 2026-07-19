<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import { t } from '$lib/i18n';
	import { MapPin } from '$lib/icons';

	const { s }: { s: PlanningEvent } = $props();
</script>

<DrawerField label={$t('drawer.title')}>
	<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.title}</div>
</DrawerField>
<DrawerField label={$t('drawer.subject')}>
	<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.subject}</div>
</DrawerField>
<div class="grid grid-cols-2 gap-3">
	<DrawerField label={$t('drawer.start')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.start}</div>
	</DrawerField>
	<DrawerField label={$t('drawer.end')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.end}</div>
	</DrawerField>
</div>
<div class="grid grid-cols-2 gap-3">
	<DrawerField label={$t('drawer.room')}>
		<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			<MapPin class="h-3.5 w-3.5 text-muted-foreground" />
			{s.room}
		</div>
	</DrawerField>
	<DrawerField label={$t('subjects.teacher')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.teacher}</div>
	</DrawerField>
</div>
