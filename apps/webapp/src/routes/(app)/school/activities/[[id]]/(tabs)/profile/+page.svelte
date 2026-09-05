<script lang="ts">
	import { page } from '$app/stores';
	import { fmtActivityDate } from '$lib/components/school/shared/drawer-constants';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import { locale, t } from '$lib/i18n';
	import { CalendarRange, Users } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { getActivitiesPageState } from '../../../activities-page.svelte';

	const activitiesPage = getActivitiesPageState();
	const activityId = $derived($page.params.id ?? '');
	const activity = $derived(activityId ? activitiesPage.findActivity(activityId) : undefined);

	const catTone: Record<string, string> = {
		Sport: 'bg-secondary text-foreground/80',
		Arts: 'bg-secondary text-foreground/80',
		Science: 'bg-secondary text-foreground/80',
		Language: 'bg-secondary text-foreground/80',
		Wellbeing: 'bg-secondary text-foreground/80',
	};

	const fieldClass = 'min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm';
</script>

{#if activity}
	<div class="space-y-4">
		<DrawerField label={$t('activities.description')}>
			<div class={cn(fieldClass, 'whitespace-pre-wrap text-foreground/80')}>{activity.description}</div>
		</DrawerField>
		<DrawerField label={$t('activities.category')}>
			<div class={fieldClass}>
				<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', catTone[activity.category])}>
					{$t(`activities.cat.${activity.category}`)}
				</span>
			</div>
		</DrawerField>
		<DrawerField label={$t('activities.coach')}>
			<div class={cn(fieldClass, 'text-foreground/80')}>{activity.coach}</div>
		</DrawerField>
		<DrawerField label={$t('activities.schedule')}>
			<div class={cn(fieldClass, 'text-foreground/80')}>{activity.schedule}</div>
		</DrawerField>
		<DrawerField label={$t('activities.startDate')}>
			<div class={cn(fieldClass, 'flex items-center gap-2 font-mono tabular-nums text-foreground/80')}>
				<CalendarRange class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				{fmtActivityDate(activity.startDate, $locale)}
			</div>
		</DrawerField>
		<DrawerField label={$t('activities.endDate')}>
			<div class={cn(fieldClass, 'flex items-center gap-2 font-mono tabular-nums text-foreground/80')}>
				<CalendarRange class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				{fmtActivityDate(activity.endDate, $locale)}
			</div>
		</DrawerField>
		<DrawerField label={$t('activities.capacity')}>
			<div class={cn(fieldClass, 'font-mono tabular-nums text-foreground/80')}>{activity.capacity}</div>
		</DrawerField>
		<DrawerField label={$t('activities.enrolled')}>
			<div class={cn(fieldClass, 'flex items-center gap-2 font-mono tabular-nums text-foreground/80')}>
				<Users class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				{activity.enrollments.length}
			</div>
		</DrawerField>
	</div>
{/if}
