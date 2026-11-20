<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import { t } from '$lib/i18n';

	const { generatedAt, noPeriod = false }: { generatedAt?: string; noPeriod?: boolean } = $props();
	const me = $derived(authSession.user);
	const school = $derived(authSession.school);

	const todayLabel = $derived(
		new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
	);

	const lastUpdatedLabel = $derived(
		new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(generatedAt ?? Date.now())),
	);

</script>

<div class="mx-auto max-w-[1400px] px-6 pt-6">
	<!-- Executive header -->
	<section class="rounded-collection border border-border bg-card p-5 shadow-soft">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<p class="font-sans tabular-nums text-xs uppercase tracking-widest text-muted-foreground">
					{$t('dashboard.title')}
				</p>
				<h1 class="mt-1 font-display text-2xl font-semibold leading-tight">
					{school?.name ?? school?.shortName ?? 'EDAYA'}
				</h1>
				<div class="mt-2 flex flex-wrap items-center gap-3">
					<span class="text-sm text-muted-foreground">{academicContext.year?.label ?? '—'}</span>
					{#if academicContext.selectablePeriodsForYear.length > 0}
						<AcademicPeriodSelector />
					{/if}
				</div>
			</div>
			<div class="text-right text-sm">
				<p class="font-medium">{todayLabel}</p>
				{#if me}
					<p class="mt-1 text-muted-foreground">{$t(`staff.role.${me.role}`)} · {me.name}</p>
				{/if}
				{#if generatedAt}
					<p class="mt-2 font-sans tabular-nums text-xs uppercase tracking-wider text-muted-foreground">
						{$t('dashboard.lastUpdated', { time: lastUpdatedLabel })}
					</p>
				{/if}
			</div>
		</div>
		{#if noPeriod}
			<p role="status" class="mt-4 rounded-collection bg-secondary/40 p-3 text-sm text-muted-foreground">
				{$t('dashboard.noPeriodNotice')}
			</p>
		{/if}
	</section>

</div>
