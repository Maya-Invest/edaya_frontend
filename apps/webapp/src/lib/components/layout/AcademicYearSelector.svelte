<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { CalendarRange } from '$lib/icons';

	const { collapsed = false, onOpenChange }: { collapsed?: boolean; onOpenChange?: (open: boolean) => void } = $props();
	const years = $derived(academicContext.publishedYears.length ? academicContext.publishedYears : academicContext.years);
</script>
<div class="mt-2 min-w-0" data-testid="academic-year-selector">
	{#if !collapsed}<p class="mb-1 text-xs text-muted-foreground">{$t('academic.workspaceYear')}</p>{/if}
	<Select.Root type="single" value={academicContext.yearId} onValueChange={value => academicContext.setYear(value)} {onOpenChange} disabled={!academicContext.shellReady || !years.length}>
		<Select.Trigger data-testid="academic-year-trigger" data-school-id={authSession.schoolId} data-year-id={academicContext.yearId} aria-label={`${$t('academic.selectYear')} · ${academicContext.year?.label ?? '—'}`}><span>{#if collapsed}<CalendarRange class="h-4 w-4" />{:else}{academicContext.year?.label ?? '—'}{/if}</span></Select.Trigger>
		<Select.Content align="start" side={collapsed ? 'right' : 'bottom'}>{#each years as year (year.id)}<Select.Item value={year.id} label={year.label}>{year.label}</Select.Item>{/each}</Select.Content>
	</Select.Root>
</div>
