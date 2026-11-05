<script lang="ts">
	import type { PeriodDefinition } from '$lib/types/school';
	import type { PeriodCalendarChanges, PeriodDayGroup } from '../lib/period-calendar';
	import WeeklyPeriodCalendar from '$lib/components/calendar/WeeklyPeriodCalendar.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { getPeriodGridPageState } from '../period-grid-page.svelte';

	const { groups, onEdit, onDelete, onCreate }: { groups: PeriodDayGroup[]; onEdit: (def: PeriodDefinition) => void; onDelete: (def: PeriodDefinition) => void; onCreate: (values: PeriodCalendarChanges) => void } = $props();
	const page = getPeriodGridPageState();
	let busy = $state(false);
	let error = $state('');
	async function update(id: string, change: Record<string, unknown>) {
		if (busy)
			return;
		busy = true;
		try {
			const result = await page.calendarWriter.update(id, change);
			error = result.ok ? '' : $t(`periodDefinitions.resize.${result.error}`, { label: result.conflict ?? '' });
		}
		finally { busy = false; }
	}
</script>
{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
<WeeklyPeriodCalendar {groups} mode={hasPermission('SCHOOL_CONFIGURE') ? 'edit' : 'readonly'} {busy} {onEdit} {onDelete} {onCreate} onUpdate={update} />
