<script lang="ts">
	import { t } from '$lib/i18n';

	export type TimetableSetupTab = 'subjects' | 'periods' | 'advanced';

	let {
		activeTab = $bindable<TimetableSetupTab>('subjects'),
	}: {
		activeTab?: TimetableSetupTab;
	} = $props();

	const tabs: { id: TimetableSetupTab; labelKey: string }[] = [
		{ id: 'subjects', labelKey: 'timetable.tabSubjects' },
		{ id: 'periods', labelKey: 'timetable.tabPreferredPeriods' },
		{ id: 'advanced', labelKey: 'timetable.tabAdvanced' },
	];
</script>

<div
	class="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1"
	role="tablist"
	aria-label={$t('timetable.setupTabsLabel')}
>
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === tab.id}
			class="rounded-lg px-2 py-2 text-xs font-medium transition sm:px-3 sm:text-sm {activeTab === tab.id
				? 'bg-card text-foreground shadow-soft'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = tab.id)}
		>
			{$t(tab.labelKey)}
		</button>
	{/each}
</div>
