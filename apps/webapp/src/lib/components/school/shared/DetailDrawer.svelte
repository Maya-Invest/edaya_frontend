<script lang="ts">
	import type { DrawerItem } from './drawer-types.ts';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';
	import { kindStyle, kindLabelKey } from './drawer-constants.ts';

	const { item, onClose }: { item: DrawerItem | null; onClose: () => void } = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (item && event.key === 'Escape')
			onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if item}
	<div
		role="presentation"
		onclick={onClose}
		class="fixed inset-0 z-40 bg-primary/5 motion-safe:animate-fade-in"
	></div>
	<aside
		class="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-panel motion-safe:animate-slide-in-right md:w-1/2"
		aria-label={$t(kindLabelKey[item.kind])}
	>
		<header class="flex items-center justify-between border-b border-border px-6 py-4">
			<span
				class="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider {kindStyle[item.kind]}"
			>
				{$t(kindLabelKey[item.kind])}
			</span>
			<button
				onclick={onClose}
				class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
			>
				<X class="h-4 w-4" />
			</button>
		</header>

		<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6">
			{#if item.kind === 'student'}
				{#await import('../students/StudentTabs.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: StudentTabs }}
					<StudentTabs s={item.data} />
				{/await}
			{:else if item.kind === 'subject'}
				{#await import('../academics/SubjectTabs.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: SubjectTabs }}
					<SubjectTabs s={item.data} />
				{/await}
			{:else if item.kind === 'planning'}
				{#await import('../scheduling/PlanningDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: PlanningDetail }}
					<PlanningDetail s={item.data} />
				{/await}
			{:else if item.kind === 'evaluation'}
				{#await import('../academics/EvaluationDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: EvaluationDetail }}
					<EvaluationDetail s={item.data} />
				{/await}
			{:else if item.kind === 'attendanceDay'}
				{#await import('../attendance/AttendanceDayDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: AttendanceDayDetail }}
					<AttendanceDayDetail day={item.data} />
				{/await}
			{:else if item.kind === 'guardian'}
				{#await import('../guardians/GuardianDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: GuardianDetail }}
					<GuardianDetail g={item.data} />
				{/await}
			{:else if item.kind === 'staff'}
				{#await import('../configuration/StaffTabs.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: StaffTabs }}
					<StaffTabs s={item.data} />
				{/await}
			{:else if item.kind === 'billing'}
				{#await import('../finance/BillingDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: BillingDetail }}
					<BillingDetail b={item.data} />
				{/await}
			{:else if item.kind === 'schoolYearEvent'}
				{#await import('../school-life/SchoolYearEventDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: SchoolYearEventDetail }}
					<SchoolYearEventDetail ev={item.data} />
				{/await}
			{:else if item.kind === 'incident'}
				{#await import('../school-life/IncidentDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: IncidentDetail }}
					<IncidentDetail i={item.data} />
				{/await}
			{:else if item.kind === 'level'}
				{#await import('../academics/LevelDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: LevelDetail }}
					<LevelDetail label={item.data.label} subtitle={item.data.subtitle} items={item.data.items} />
				{/await}
			{:else if item.kind === 'announcement'}
				{#await import('../school-life/AnnouncementDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: AnnouncementDetail }}
					<AnnouncementDetail announcement={item.data} />
				{/await}
			{:else if item.kind === 'activity'}
				{#await import('../school-life/ActivityDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: ActivityDetail }}
					<ActivityDetail a={item.data} />
				{/await}
			{:else if item.kind === 'reportCardDefinition'}
				{#await import('../configuration/ReportCardDefinitionDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: ReportCardDefinitionDetail }}
					<ReportCardDefinitionDetail definition={item.data} />
				{/await}
			{:else if item.kind === 'reportCardResult'}
				{#await import('../configuration/ReportCardResultDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: ReportCardResultDetail }}
					<ReportCardResultDetail result={item.data} />
				{/await}
			{:else if item.kind === 'gradeLevel'}
				{#await import('../configuration/GradeLevelDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: GradeLevelDetail }}
					<GradeLevelDetail gradeLevel={item.data} />
				{/await}
			{:else if item.kind === 'classGroup'}
				{#await import('../configuration/ClassGroupDetail.svelte')}
					<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
				{:then { default: ClassGroupDetail }}
					<ClassGroupDetail classGroup={item.data} />
				{/await}
			{/if}
		</div>

		<footer class="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
			<Button variant="ghost" onclick={onClose} class="rounded-full">{$t('common.close')}</Button>
		</footer>
	</aside>
{/if}
