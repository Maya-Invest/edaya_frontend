<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';

	export type TimetableSetupTab = 'subjects' | 'periods' | 'advanced';

	let {
		activeTab = $bindable<TimetableSetupTab>('subjects'),
		disabled = false,
		id,
	}: {
		activeTab?: TimetableSetupTab;
		disabled?: boolean;
		id: string;
	} = $props();

	const tabs: { id: TimetableSetupTab; labelKey: string }[] = [
		{ id: 'subjects', labelKey: 'timetable.tabSubjects' },
		{ id: 'periods', labelKey: 'timetable.tabPreferredPeriods' },
		{ id: 'advanced', labelKey: 'timetable.tabAdvanced' },
	];

	function moveTab(event: KeyboardEvent, current: TimetableSetupTab) {
		if (disabled || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
			return;
		event.preventDefault();
		const index = tabs.findIndex(tab => tab.id === current);
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
		activeTab = tabs[next]!.id;
		document.getElementById(`${id}-${activeTab}`)?.focus();
	}
</script>

<div
	class="flex flex-wrap gap-2 rounded-xl bg-secondary/50 p-2"
	role="tablist"
	aria-label={$t('timetable.setupTabsLabel')}
>
	{#each tabs as tab (tab.id)}
		<Button variant="ghost"
			type="button"
			role="tab"
			{disabled}
			id={`${id}-${tab.id}`}
			aria-controls={`${id}-panel-${tab.id}`}
			tabindex={activeTab === tab.id ? 0 : -1}
			onkeydown={event => moveTab(event, tab.id)}
			aria-selected={activeTab === tab.id}
			class={activeTab === tab.id ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'}
			onclick={() => (activeTab = tab.id)}
		>
			{$t(tab.labelKey)}
		</Button>
	{/each}
</div>
