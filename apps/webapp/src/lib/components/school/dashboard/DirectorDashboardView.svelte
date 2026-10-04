<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import type { SchoolOverviewResponse } from '$lib/api/dashboard-data';
	import { academicContext } from '$lib/academic/context.svelte';
	import { t } from '$lib/i18n';
	import {
		AlertTriangle,
		BookOpen,
		CalendarX2,
		ChevronRight,
		FileSpreadsheet,
		Sparkle,
		Users,
		Wallet,
	} from '$lib/icons';
	import { appPath } from '$lib/navigation/app-navigation';
	import { dashboardActionHref, dashboardAttendanceTodayHref, dashboardClassStudentsHref } from '$lib/navigation/dashboard-links';
	import { BADGE, BADGE_DANGER, BADGE_WARN } from '$lib/ui-tones';
	import { cn } from '$lib/utils';

	const { overview }: { overview: SchoolOverviewResponse } = $props();

	const kpis = $derived(overview.kpis);
	const areaHealth = $derived(overview.areaHealth);
	const attendanceTodayHref = $derived(dashboardAttendanceTodayHref(academicContext.classes));

	const actionModuleKeys: Record<
		SchoolOverviewResponse['actionItems'][number]['key'],
		string
	> = {
		overdue_fees: 'dashboard.module.finance',
		unpublished_report_cards: 'dashboard.module.reportCards',
		pending_justifications: 'dashboard.module.students',
		pending_student_photos: 'dashboard.module.students',
		high_severity_incidents: 'dashboard.module.schoolLife',
		incomplete_grading: 'dashboard.module.evaluations',
	};

	function actionHref(key: SchoolOverviewResponse['actionItems'][number]['key']): ResolvedPathname {
		return dashboardActionHref(key, academicContext.classes);
	}

	const upcomingKindLabel: Record<SchoolOverviewResponse['upcoming'][number]['kind'], string> = {
		calendar: 'dashboard.upcoming.calendar',
		fee_due: 'dashboard.upcoming.feeDue',
		report_card_deadline: 'dashboard.upcoming.reportCardDeadline',
		exam: 'dashboard.upcoming.exam',
		holiday: 'dashboard.upcoming.holiday',
	};

	const riskBadgeClass: Record<
		SchoolOverviewResponse['classRiskRows'][number]['riskLevel'],
		string
	> = {
		normal: BADGE,
		watch: BADGE_WARN,
		needs_action: BADGE_DANGER,
	};

	const riskLabelKey: Record<
		SchoolOverviewResponse['classRiskRows'][number]['riskLevel'],
		string
	> = {
		normal: 'dashboard.classRisk.normal',
		watch: 'dashboard.classRisk.watch',
		needs_action: 'dashboard.classRisk.needsAction',
	};

	const kpiToneClass = {
		primary: 'bg-primary text-primary-foreground',
		sky: 'bg-secondary text-foreground/80',
		warn: 'bg-highlight-soft text-highlight',
		destructive: 'bg-destructive/10 text-destructive',
	} as const;

	function formatAmount(amount: number): string {
		return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
	}

	function formatPercent(value: number | null): string {
		return value === null ? '—' : `${value}%`;
	}

	function actionTitle(key: SchoolOverviewResponse['actionItems'][number]['key']): string {
		return $t(`dashboard.action.${key}`);
	}

	function actionMeta(item: SchoolOverviewResponse['actionItems'][number]): string {
		if (item.key === 'overdue_fees' && item.amount !== undefined) {
			return $t('dashboard.action.overdueFeesMeta', {
				amount: formatAmount(item.amount),
				module: $t(actionModuleKeys[item.key]),
			});
		}
		return $t('dashboard.action.meta', {
			count: item.count,
			module: $t(actionModuleKeys[item.key]),
		});
	}

	function upcomingDayLabel(date: string): string {
		return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
	}

	function classHref(classGroupId: string): ResolvedPathname {
		return dashboardClassStudentsHref(classGroupId, academicContext.classes);
	}

	function healthMetric(value: string | number, warn = false): string {
		return cn('font-sans text-xl font-semibold tabular-nums', warn && 'text-highlight');
	}
</script>

<div class="animate-fade-in mx-auto max-w-[1400px] space-y-6 overflow-y-auto p-6">
	<!-- Top KPIs -->
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
		<a
			href={appPath('/(app)/school/students/[[id]]')}
			class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
		>
			<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpiToneClass.primary)}>
				<Users class="h-4 w-4" />
			</div>
			<p class="mt-3 font-sans text-2xl font-semibold tabular-nums">{kpis.studentCount}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('dashboard.kpi.students')}</p>
		</a>

		{#snippet attendanceTodayBody()}
			<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpiToneClass.sky)}>
				<CalendarX2 class="h-4 w-4" />
			</div>
			<p class="mt-3 font-sans text-2xl font-semibold tabular-nums">
				{formatPercent(kpis.attendanceRateToday)}
			</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('dashboard.kpi.attendanceToday')}</p>
		{/snippet}
		{#if attendanceTodayHref}
			<a
				href={attendanceTodayHref}
				class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
			>
				{@render attendanceTodayBody()}
			</a>
		{:else}
			<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
				{@render attendanceTodayBody()}
			</div>
		{/if}

		<a
			href={appPath('/(app)/finance/billing/[[id]]')}
			class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
		>
			<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpis.overdueFeeCount > 0 ? kpiToneClass.warn : kpiToneClass.sky)}>
				<Wallet class="h-4 w-4" />
			</div>
			<p class="mt-3 font-sans text-2xl font-semibold tabular-nums">{kpis.overdueFeeCount}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('dashboard.kpi.overdueFees')}</p>
		</a>

		<a
			href={appPath('/(app)/configuration/report-cards/[[id]]')}
			class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
		>
			<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpis.unpublishedReportCardCount > 0 ? kpiToneClass.warn : kpiToneClass.sky)}>
				<FileSpreadsheet class="h-4 w-4" />
			</div>
			<p class="mt-3 font-sans text-2xl font-semibold tabular-nums">{kpis.unpublishedReportCardCount}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('dashboard.kpi.reportCards')}</p>
		</a>

		<a
			href={appPath('/(app)/school/events/[[id]]')}
			class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
		>
			<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpis.openIncidentCount > 0 ? kpiToneClass.destructive : kpiToneClass.sky)}>
				<AlertTriangle class="h-4 w-4" />
			</div>
			<p class="mt-3 font-sans text-2xl font-semibold tabular-nums">{kpis.openIncidentCount}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">
				{$t('dashboard.kpi.openIncidents')}
				{#if kpis.highSeverityIncidentCount > 0}
					· <span class="font-medium text-destructive">
						{$t('dashboard.kpi.highSeverity', { count: kpis.highSeverityIncidentCount })}
					</span>
				{/if}
			</p>
		</a>
	</div>

	<!-- Priority actions + Next 7 days -->
	<div class="grid gap-4 lg:grid-cols-12">
		<section class="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-7">
			<header class="mb-4">
				<h2 class="font-display text-base font-semibold">{$t('dashboard.actions.title')}</h2>
			</header>
			{#if overview.actionItems.length === 0}
				<div class="rounded-xl bg-secondary/40 px-4 py-6 text-sm text-muted-foreground">
					{$t('dashboard.actions.empty')}
				</div>
			{:else}
				<ul class="divide-y divide-border">
					{#each overview.actionItems as item (item.key)}
						<li>
							<a
								href={actionHref(item.key)}
								class="flex items-center justify-between gap-3 py-3.5 text-sm transition hover:text-primary"
							>
								<div class="min-w-0">
									<p class="font-medium">{actionTitle(item.key)}</p>
									<p class="text-xs text-muted-foreground">{actionMeta(item)}</p>
								</div>
								<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-5">
			<header class="mb-4 flex items-center justify-between gap-3">
				<h2 class="font-display text-base font-semibold">{$t('dashboard.upcoming.title')}</h2>
				<a
					href={appPath('/(app)/school/calendar')}
					class="text-xs font-medium text-primary hover:underline"
				>
					{$t('dashboard.upcoming.viewCalendar')}
				</a>
			</header>
			<ul class="space-y-3">
				{#each overview.upcoming as item (item.id)}
					<li class="flex items-start gap-3 text-sm">
						<span class="w-14 shrink-0 font-sans tabular-nums text-[11px] uppercase text-muted-foreground">
							{upcomingDayLabel(item.date)}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium">{item.title}</p>
							<p class="text-xs text-muted-foreground">{$t(upcomingKindLabel[item.kind])}</p>
						</div>
						<span
							class={cn(
								'mt-1.5 h-2 w-2 shrink-0 rounded-full',
								item.highlight ? 'bg-highlight' : 'bg-primary/60',
							)}
						></span>
					</li>
				{:else}
					<li class="rounded-xl bg-secondary/40 px-4 py-5 text-sm text-muted-foreground">
						{$t('dashboard.upcoming.empty')}
					</li>
				{/each}
			</ul>
		</section>
	</div>

	<!-- School health by area -->
	<section>
		<h2 class="mb-3 font-display text-base font-semibold">{$t('dashboard.health.title')}</h2>
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<a
				href={appPath('/(app)/school/students/[[id]]')}
				class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
			>
				<div class="mb-3 flex items-center gap-2 text-muted-foreground">
					<Users class="h-4 w-4" />
					<span class="text-xs font-medium">{$t('dashboard.health.students')}</span>
				</div>
				<dl class="space-y-2 text-sm">
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.attendanceRate')}</dt>
						<dd class={healthMetric(formatPercent(areaHealth.students.attendanceRateToday))}>
							{formatPercent(areaHealth.students.attendanceRateToday)}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.absencesToday')}</dt>
						<dd class={healthMetric(areaHealth.students.absencesToday, areaHealth.students.absencesToday > 0)}>
							{areaHealth.students.absencesToday}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.pendingJustifications')}</dt>
						<dd class={healthMetric(areaHealth.students.pendingJustifications, areaHealth.students.pendingJustifications > 0)}>
							{areaHealth.students.pendingJustifications}
						</dd>
					</div>
				</dl>
			</a>

			<a
				href={appPath('/(app)/configuration/report-cards/[[id]]')}
				class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
			>
				<div class="mb-3 flex items-center gap-2 text-muted-foreground">
					<BookOpen class="h-4 w-4" />
					<span class="text-xs font-medium">{$t('dashboard.health.academics')}</span>
				</div>
				<dl class="space-y-2 text-sm">
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.gradingCompletion')}</dt>
						<dd class={healthMetric(formatPercent(areaHealth.academics.gradingCompletionPercent))}>
							{formatPercent(areaHealth.academics.gradingCompletionPercent)}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.reportCardsPublished')}</dt>
						<dd class={healthMetric(`${areaHealth.academics.publishedReportCards}/${areaHealth.academics.totalReportCards}`)}>
							{areaHealth.academics.publishedReportCards}/{areaHealth.academics.totalReportCards}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.incompleteClasses')}</dt>
						<dd class={healthMetric(areaHealth.academics.incompleteGradingClassCount, areaHealth.academics.incompleteGradingClassCount > 0)}>
							{areaHealth.academics.incompleteGradingClassCount}
						</dd>
					</div>
				</dl>
			</a>

			<a
				href={appPath('/(app)/finance/billing/[[id]]')}
				class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
			>
				<div class="mb-3 flex items-center gap-2 text-muted-foreground">
					<Wallet class="h-4 w-4" />
					<span class="text-xs font-medium">{$t('dashboard.health.finance')}</span>
				</div>
				<dl class="space-y-2 text-sm">
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.overdueAmount')}</dt>
						<dd class={healthMetric(formatAmount(areaHealth.finance.overdueAmount), areaHealth.finance.overdueAmount > 0)}>
							{formatAmount(areaHealth.finance.overdueAmount)}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.studentsWithBalance')}</dt>
						<dd class={healthMetric(areaHealth.finance.studentsWithBalance, areaHealth.finance.studentsWithBalance > 0)}>
							{areaHealth.finance.studentsWithBalance}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.recentPayments')}</dt>
						<dd class={healthMetric(`${areaHealth.finance.recentPaymentCount} · ${formatAmount(areaHealth.finance.recentPaymentAmount)}`)}>
							{areaHealth.finance.recentPaymentCount} · {formatAmount(areaHealth.finance.recentPaymentAmount)}
						</dd>
					</div>
				</dl>
			</a>

			<a
				href={appPath('/(app)/school/events/[[id]]')}
				class="rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/30"
			>
				<div class="mb-3 flex items-center gap-2 text-muted-foreground">
					<Sparkle class="h-4 w-4" />
					<span class="text-xs font-medium">{$t('dashboard.health.schoolLife')}</span>
				</div>
				<dl class="space-y-2 text-sm">
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.openIncidents')}</dt>
						<dd class={healthMetric(areaHealth.schoolLife.openIncidentCount, areaHealth.schoolLife.openIncidentCount > 0)}>
							{areaHealth.schoolLife.openIncidentCount}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.highSeverity')}</dt>
						<dd class={healthMetric(areaHealth.schoolLife.highSeverityIncidentCount, areaHealth.schoolLife.highSeverityIncidentCount > 0)}>
							{areaHealth.schoolLife.highSeverityIncidentCount}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.activeActivities')}</dt>
						<dd class={healthMetric(areaHealth.schoolLife.activeActivityCount)}>
							{areaHealth.schoolLife.activeActivityCount}
						</dd>
					</div>
					<div class="flex items-baseline justify-between gap-2">
						<dt class="text-muted-foreground">{$t('dashboard.health.unresolvedDiscipline')}</dt>
						<dd class={healthMetric(areaHealth.schoolLife.unresolvedDisciplineCount, areaHealth.schoolLife.unresolvedDisciplineCount > 0)}>
							{areaHealth.schoolLife.unresolvedDisciplineCount}
						</dd>
					</div>
				</dl>
			</a>
		</div>
	</section>

	<!-- Class risk table -->
	<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<header class="border-b border-border px-5 py-4">
			<h2 class="font-display text-base font-semibold">{$t('dashboard.classRisk.title')}</h2>
		</header>
		{#if overview.classRiskRows.length === 0}
			<p class="px-5 py-8 text-sm text-muted-foreground">{$t('dashboard.classRisk.empty')}</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[800px] text-sm">
					<thead class="border-b border-border bg-secondary/30 text-left">
						<tr>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.class')}</th>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.attendance')}</th>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.incidents')}</th>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.grading')}</th>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.overdueFees')}</th>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.coordinator')}</th>
							<th class="px-4 py-3 font-medium">{$t('dashboard.classRisk.risk')}</th>
						</tr>
					</thead>
					<tbody>
						{#each overview.classRiskRows as row (row.classGroupId)}
							<tr class="border-b border-border/60 last:border-0 transition hover:bg-secondary/20">
								<td class="px-4 py-3">
									<a href={classHref(row.classGroupId)} class="font-medium hover:text-primary">
										{row.className}
									</a>
								</td>
								<td class="px-4 py-3 font-sans tabular-nums">
									{formatPercent(row.attendanceRateToday)}
								</td>
								<td class="px-4 py-3 font-sans tabular-nums">
									<span class={row.openIncidentCount > 0 ? 'text-destructive' : ''}>
										{row.openIncidentCount}
									</span>
								</td>
								<td class="px-4 py-3 font-sans tabular-nums">
									{formatPercent(row.gradingCompletionPercent)}
								</td>
								<td class="px-4 py-3 font-sans tabular-nums">
									<span class={row.overdueFeeCount > 0 ? 'text-highlight' : ''}>
										{row.overdueFeeCount}
									</span>
								</td>
								<td class="px-4 py-3 text-muted-foreground">
									{row.coordinatorName ?? '—'}
								</td>
								<td class="px-4 py-3">
									<span class={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', riskBadgeClass[row.riskLevel])}>
										{$t(riskLabelKey[row.riskLevel])}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
