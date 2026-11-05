<script lang="ts">

	import { t } from '$lib/i18n';

	export type TimetableSetupTab = 'subjects' | 'periods' | 'advanced';

	let {
		activeTab = $bindable<TimetableSetupTab>('subjects'),
		disabled = false,
		id,
		invalidTabs = [],
		onTabChange,
	}: {
		activeTab?: TimetableSetupTab;
		disabled?: boolean;
		id: string;
		invalidTabs?: TimetableSetupTab[];
		onTabChange: (tab: TimetableSetupTab) => void;
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
		onTabChange(activeTab);
		document.getElementById(`${id}-${activeTab}`)?.focus();
	}
</script>

<div
	class="flex flex-wrap gap-1 border-b border-border"
	role="tablist"
	aria-label={$t('timetable.setupTabsLabel')}
>
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			role="tab"
			{disabled}
			id={`${id}-${tab.id}`}
			aria-controls={`${id}-panel-${tab.id}`}
			tabindex={activeTab === tab.id ? 0 : -1}
			onkeydown={event => moveTab(event, tab.id)}
			aria-selected={activeTab === tab.id}
			class="setup-tab control-focus"
			onclick={() => onTabChange(tab.id)}
		>
			{$t(tab.labelKey)}{#if invalidTabs.includes(tab.id)}<span class="ml-1 text-destructive" aria-label={$t('form.invalid')}>!</span>{/if}
		</button>
	{/each}
</div>

<style>
 .setup-tab { min-height:44px; padding:8px 12px; border-bottom:2px solid transparent; text-align:left; }
 .setup-tab[aria-selected="true"] { border-bottom-color:hsl(var(--primary)); color:hsl(var(--primary)); }
</style>
