<script lang="ts">
	import type { School } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import { switchActiveSchool } from '$lib/auth/switch-school';
	import { t } from '$lib/i18n';
	import { Building2, Check, ChevronDown } from '$lib/icons';
	import { DASHBOARD_HREF } from '$lib/navigation';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { consortiumShell } from '$lib/shell/consortium-shell.svelte';
	import { cn } from '$lib/utils';

	const { schools }: { schools: School[] } = $props();

	let open = $state(false);

	const school = $derived(authSession.school ?? schools[0]);
	const canSwitch = $derived(consortiumShell.consortium !== null);
	const onConsortiumPage = $derived(
		$page.url.pathname === '/consortium' || $page.url.pathname.startsWith('/consortium/'),
	);

	const availableSchools = $derived.by(() => {
		if (consortiumShell.schools.length > 0) {
			return consortiumShell.schools.map(entry => ({
				id: entry.id,
				name: entry.name,
				shortName: entry.name,
			}));
		}
		return academicContext.schools.length > 0 ? academicContext.schools : schools;
	});

	const chipLabel = $derived(
		onConsortiumPage && consortiumShell.consortium
			? consortiumShell.consortium.name
			: (school?.shortName ?? school?.name ?? '—'),
	);

	const chipTitle = $derived(
		onConsortiumPage && consortiumShell.consortium
			? $t('consortium.currentGroup')
			: (school?.name ?? ''),
	);

	$effect(() => {
		if (authSession.sessionKind === 'staff') {
			void consortiumShell.ensureLoaded(authSession.sessionKind);
		}
	});

	async function handleSelectSchool(schoolId: string) {
		open = false;
		const leavingConsortium = onConsortiumPage;
		if (schoolId !== authSession.schoolId) {
			await switchActiveSchool(schoolId);
		}
		if (leavingConsortium) {
			await appGoto(DASHBOARD_HREF);
		}
	}
</script>

{#if !canSwitch}
	{#if school}
		<div
			class="flex h-9 max-w-[11rem] items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium"
			title={school.name}
		>
			<Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
			<span class="truncate">{school.shortName}</span>
		</div>
	{/if}
{:else}
	<div class="flex items-center gap-2">
		{#if availableSchools.length >= 1}
			<div class="relative">
				<button
					type="button"
					onclick={() => (open = !open)}
					class={cn(
						'flex h-9 max-w-[13rem] items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-secondary',
						open && 'bg-secondary',
					)}
					title={chipTitle}
					aria-label={$t('consortium.selectSchool')}
					aria-haspopup="listbox"
					aria-expanded={open}
				>
					<Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<span class="truncate">{chipLabel}</span>
					<ChevronDown class={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-180')} />
				</button>

				{#if open}
					<div
						class="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-panel animate-fade-in"
					>
						<ul class="max-h-72 overflow-y-auto py-1" role="listbox" aria-label={$t('consortium.selectSchool')}>
							{#each availableSchools as entry (entry.id)}
								<li>
									<button
										type="button"
										role="option"
										aria-selected={entry.id === authSession.schoolId}
										onclick={() => handleSelectSchool(entry.id)}
										class={cn(
											'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60',
											entry.id === authSession.schoolId && 'bg-primary/5',
										)}
									>
										<span class="truncate">{entry.name}</span>
										{#if entry.id === authSession.schoolId}
											<Check class="h-3.5 w-3.5 shrink-0 text-accent" />
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{:else if school}
			<div
				class="flex h-9 max-w-[11rem] items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium"
				title={school.name}
			>
				<Building2 class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				<span class="truncate">{school.shortName}</span>
			</div>
		{/if}

		{#if !onConsortiumPage}
			<a
				href={appPath('/(app)/consortium')}
				class="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
			>
				{$t('consortium.openDashboard')}
			</a>
		{/if}
	</div>
{/if}
