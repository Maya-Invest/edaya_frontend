<script lang="ts">
	import type { AcademicYear } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { workspaceYearChoices } from '$lib/academic/year-switcher';
	import { authSession } from '$lib/auth/session.svelte';
	import { previewSchoolYears, switchActiveSchool } from '$lib/auth/switch-school';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Label from '$lib/components/ui/label/label.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { ChevronDown, X } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { toast } from '$lib/toast.svelte';
	import { onDestroy, tick } from 'svelte';

	const { collapsed = false, onOpenChange }: { collapsed?: boolean; onOpenChange?: (open: boolean) => void } = $props();
	const uid = $props.id();
	const dirtyWork = getDirtyWork();
	const memberships = $derived(authSession.staffMemberships);
	const schoolName = $derived(authSession.school?.shortName?.trim() || authSession.activeStaffMembership?.schoolShortName?.trim() || authSession.activeStaffMembership?.schoolName || $t('sidebar.module'));
	const activeYears = $derived(workspaceYearChoices(academicContext.years, authSession.schoolId));
	const ready = $derived(academicContext.shellReady && academicContext.schoolScopeId === authSession.schoolId);
	const current = $derived(ready ? activeYears.find(year => year.id === academicContext.yearId) : undefined);
	const identity = $derived(JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.sessionKind, authSession.userId]));
	let open = $state(false);
	let openedIdentity = $state('');
	let schoolId = $state('');
	let selectedId = $state('');
	let previewYears = $state<AcademicYear[]>([]);
	let previewStatus = $state<'loading' | 'error' | 'ready'>('ready');
	let previewRequest = 0;
	const differentSchool = $derived(schoolId !== authSession.schoolId);
	const years = $derived(differentSchool ? previewYears : activeYears);
	const catalogReady = $derived(differentSchool ? previewStatus === 'ready' : ready);
	let error = $state('');
	let pendingChange = $state<(() => void) | null>(null);
	const awaitingGuard = $derived(Boolean(pendingChange && dirtyWork?.pending === pendingChange));
	const selected = $derived(years.find(year => year.id === selectedId));
	const canSwitch = $derived(catalogReady && !dirtyWork?.pending && (differentSchool ? Boolean(selected) || years.length === 0 : Boolean(selected) && selectedId !== academicContext.yearId));
	const triggerDisabled = $derived(memberships.length <= 1 && (!ready || !activeYears.length));
	const triggerLabel = $derived(!ready ? $t('academic.yearSwitcher.loading') : !activeYears.length ? $t('academic.yearSwitcher.empty') : current?.label ?? $t('academic.selectYear'));

	async function previewSchool() {
		const request = ++previewRequest;
		previewYears = [];
		error = '';
		if (schoolId === authSession.schoolId) {
			selectedId = current?.id ?? '';
			previewStatus = 'ready';
			return;
		}
		selectedId = '';
		const membership = memberships.find(entry => entry.schoolId === schoolId);
		if (!membership) {
			previewStatus = 'error';
			return;
		}
		previewStatus = 'loading';
		try {
			const result = await previewSchoolYears(membership);
			if (request !== previewRequest || !open || identity !== openedIdentity)
				return;
			previewYears = workspaceYearChoices(result, membership.schoolId);
			const saved = academicContext.savedSchoolYear(membership.schoolId);
			selectedId = (previewYears.find(year => year.id === saved) ?? previewYears.find(year => year.status === 'published') ?? previewYears[0])?.id ?? '';
			previewStatus = 'ready';
		}
		catch {
			if (request === previewRequest)
				previewStatus = 'error';
		}
	}

	function cancelPending() {
		if (pendingChange && dirtyWork?.pending === pendingChange)
			dirtyWork.cancel();
		pendingChange = null;
	}
	function changeOpen(next: boolean) {
		if (next && triggerDisabled)
			return;
		if (next) {
			openedIdentity = identity;
			schoolId = authSession.schoolId ?? '';
			previewStatus = 'ready';
			selectedId = current?.id ?? '';
			error = '';
		}
		else {
			previewRequest++;
			cancelPending();
			selectedId = '';
			error = '';
		}
		open = next;
		onOpenChange?.(next);
	}
	function applySelection() {
		if (!canSwitch || !open)
			return;
		const target = selectedId;
		const targetSchool = schoolId;
		const capturedIdentity = identity;
		const capturedScope = academicContext.scopeGeneration;
		const apply = () => {
			pendingChange = null;
			if (!open || identity !== capturedIdentity)
				return;
			const schoolChange = targetSchool !== authSession.schoolId;
			if (!catalogReady || academicContext.scopeGeneration !== capturedScope
				|| (schoolChange && !memberships.some(member => member.schoolId === targetSchool))
				|| !(years.some(year => year.id === target) || (schoolChange && !target && !years.length))) {
				error = $t('academic.yearSwitcher.unavailable');
				return;
			}
			changeOpen(false);
			if (schoolChange)
				void switchActiveSchool(targetSchool, target).catch(() => toast.error($t('auth.sessionUnavailable')));
			else
				academicContext.setYear(target);
		};
		pendingChange = apply;
		if (dirtyWork)
			dirtyWork.request(apply);
		else apply();
	}
	$effect(() => {
		if (open && identity !== openedIdentity)
			changeOpen(false);
	});
	onDestroy(() => {
		cancelPending();
		onOpenChange?.(false);
	});
	function date(value: string) {
		return /^\d{4}-\d{2}-\d{2}/.test(value) && Number.isFinite(new Date(value.slice(0, 10)).getTime())
			? formatLocaleDate(value, $locale, { year: 'numeric', month: 'short', day: 'numeric' })
			: $t('value.notProvided');
	}
</script>

<Dialog.Root {open} onOpenChange={changeOpen}>
	<Dialog.Trigger disabled={triggerDisabled}>
		{#snippet child({ props })}
			<button {...props} type="button" data-testid="academic-year-trigger" data-school-id={authSession.schoolId} data-year-id={current?.id ?? ''}
				aria-label={$t('academic.yearSwitcher.trigger', { school: schoolName, year: triggerLabel })}
				class="control-focus flex min-h-12 w-full items-center gap-2 py-3 lg:h-full lg:min-h-0 lg:py-0 text-left hover:bg-secondary {collapsed ? 'justify-center' : 'px-3'}">
				<BrandLogo variant="symbol" width={collapsed ? 26 : 32} decorative />
				{#if !collapsed}
					<span class="flex min-h-8 min-w-0 flex-1 flex-col justify-between">
						<span class="truncate text-sm font-semibold leading-none" title={schoolName} data-testid="sidebar-school-name">{schoolName}</span>
						<span class="truncate text-xs leading-none text-muted-foreground" title={triggerLabel} data-testid="academic-year-value">{triggerLabel}</span>
					</span>
					<ChevronDown class="h-4 w-4 shrink-0 -translate-y-2 text-muted-foreground" aria-hidden="true" />
				{/if}
			</button>
		{/snippet}
	</Dialog.Trigger>
	{#if open}
		<Dialog.Content data-testid="academic-year-dialog" class="flex flex-col overflow-hidden" onOpenAutoFocus={async (event) => {
			event.preventDefault();
			await tick();
			document.getElementById(memberships.length > 1 ? `${uid}-school` : `${uid}-year`)?.focus();
		}}>
			<Dialog.Header class="shrink-0 text-left">
				<div class="flex items-start justify-between gap-4"><Dialog.Title class="min-w-0 break-words font-display text-xl leading-tight">{$t('academic.yearSwitcher.title')}</Dialog.Title><Button variant="ghost" size="icon" aria-label={$t('common.close')} onclick={() => changeOpen(false)}><X class="h-4 w-4" /></Button></div>
			</Dialog.Header>
			<div class="min-h-0 space-y-4 overflow-y-auto">
				<Dialog.Description>{$t('academic.yearSwitcher.description')}</Dialog.Description>
				<div class="space-y-2">
					{#if memberships.length > 1}
						<Label for={`${uid}-school`}>{$t('auth.school')}</Label>
						<SelectField id={`${uid}-school`} data-testid="workspace-school-choice" bind:value={schoolId} disabled={awaitingGuard} onchange={previewSchool}>
							{#each memberships as member (member.schoolId)}<option value={member.schoolId}>{member.schoolName}</option>{/each}
						</SelectField>
					{:else}
						<p class="text-sm font-medium">{$t('auth.school')}</p>
						<p class="break-words">{authSession.activeStaffMembership?.schoolName || schoolName}</p>
					{/if}
				</div>
				<div class="space-y-2"><Label for={`${uid}-year`}>{$t('academic.yearSwitcher.contextLabel')}</Label><SelectField id={`${uid}-year`} data-testid="academic-year-choice" aria-describedby={selected ? `${uid}-dates` : undefined} bind:value={selectedId} disabled={!catalogReady || !years.length || awaitingGuard} onchange={() => error = ''}>
					<option value="">{$t('academic.selectYear')}</option>
					{#each years as year (year.id)}<option value={year.id}>{$t('academic.yearSwitcher.option', { year: year.label, status: $t(`academic.yearSwitcher.status.${year.status}`) })}</option>{/each}
				</SelectField></div>
				{#if selected}<p id={`${uid}-dates`} data-testid="academic-year-dates" class="break-words text-sm text-muted-foreground">{$t('academic.yearSwitcher.dates', { start: date(selected.startDate), end: date(selected.endDate) })}</p>{/if}
				{#if differentSchool && previewStatus === 'error'}
					<p role="alert" class="text-sm text-destructive">{$t('academic.yearSwitcher.loadError')}</p>
					<Button variant="outline" onclick={previewSchool}>{$t('dataState.retry')}</Button>
				{:else if catalogReady && !years.length}
					<p role="status" class="text-sm text-muted-foreground">{$t('academic.yearSwitcher.empty')}</p>
				{:else if !catalogReady}<p role="status" class="text-sm text-muted-foreground">{$t('academic.yearSwitcher.loading')}</p>{/if}
				{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
			</div>
			<Dialog.Footer class="shrink-0 border-t border-border pt-4"><Button variant="outline" onclick={() => changeOpen(false)}>{$t('common.cancel')}</Button><Button data-testid="academic-year-apply" disabled={!canSwitch} onclick={applySelection}>{$t('academic.yearSwitcher.apply')}</Button></Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
