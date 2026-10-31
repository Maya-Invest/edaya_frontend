<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import { workspaceYearChoices } from '$lib/academic/year-switcher';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import Label from '$lib/components/ui/label/label.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { CalendarRange, X } from '$lib/icons';
	import { getDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { onDestroy, tick } from 'svelte';

	const { collapsed = false, onOpenChange }: { collapsed?: boolean; onOpenChange?: (open: boolean) => void } = $props();
	const uid = $props.id();
	const dirtyWork = getDirtyWork();
	const years = $derived(workspaceYearChoices(academicContext.years, authSession.schoolId));
	const ready = $derived(academicContext.shellReady && academicContext.schoolScopeId === authSession.schoolId);
	const current = $derived(ready ? years.find(year => year.id === academicContext.yearId) : undefined);
	const identity = $derived(JSON.stringify([authSession.authUserId, authSession.schoolId, authSession.sessionKind, authSession.userId]));
	let open = $state(false);
	let openedIdentity = $state('');
	let selectedId = $state('');
	let error = $state('');
	let pendingChange = $state<(() => void) | null>(null);
	const awaitingGuard = $derived(Boolean(pendingChange && dirtyWork?.pending === pendingChange));
	const selected = $derived(years.find(year => year.id === selectedId));
	const canSwitch = $derived(ready && Boolean(selected) && selectedId !== academicContext.yearId && !dirtyWork?.pending);
	const triggerLabel = $derived(!ready ? $t('academic.yearSwitcher.loading') : !years.length ? $t('academic.yearSwitcher.empty') : current?.label ?? $t('academic.selectYear'));

	function cancelPending() {
		if (pendingChange && dirtyWork?.pending === pendingChange)
			dirtyWork.cancel();
		pendingChange = null;
	}
	function changeOpen(next: boolean) {
		if (next && (!ready || !years.length))
			return;
		if (next) {
			openedIdentity = identity;
			selectedId = current?.id ?? '';
			error = '';
		}
		else {
			cancelPending();
			selectedId = '';
			error = '';
		}
		open = next;
		onOpenChange?.(next);
	}
	function switchYear() {
		if (!canSwitch || !open)
			return;
		const target = selectedId;
		const capturedIdentity = identity;
		const capturedScope = academicContext.scopeGeneration;
		const apply = () => {
			pendingChange = null;
			if (!open || identity !== capturedIdentity)
				return;
			if (!ready || academicContext.scopeGeneration !== capturedScope || !years.some(year => year.id === target)) {
				error = $t('academic.yearSwitcher.unavailable');
				return;
			}
			academicContext.setYear(target);
			changeOpen(false);
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
	<div class="min-w-0" data-testid="academic-year-selector">
		{#if !collapsed}<p class="ui-workspace-year-label" data-testid="academic-year-label">{$t('academic.yearSwitcher.contextLabel')}</p>{/if}
		<Dialog.Trigger disabled={!ready || !years.length}>
			{#snippet child({ props })}
				<Button {...props} variant={collapsed ? 'ghost' : 'link'} size={collapsed ? 'icon' : 'default'} class={collapsed ? undefined : 'ui-workspace-year-link'}
					data-testid="academic-year-trigger" data-school-id={authSession.schoolId} data-year-id={ready ? current?.id ?? '' : ''}
					aria-label={$t('academic.yearSwitcher.trigger', { year: triggerLabel })} aria-describedby={!ready || !years.length ? `${uid}-availability` : undefined} disabled={!ready || !years.length}>
					{#if collapsed}<CalendarRange class="h-4 w-4" aria-hidden="true" />{:else}{triggerLabel}{/if}
				</Button>
			{/snippet}
		</Dialog.Trigger>
		{#if !ready || !years.length}<p id={`${uid}-availability`} class="sr-only">{!ready ? $t('academic.yearSwitcher.loading') : $t('academic.yearSwitcher.empty')}</p>{/if}
	</div>
	{#if open}
		<Dialog.Content data-testid="academic-year-dialog" class="flex flex-col overflow-hidden" onOpenAutoFocus={async (event) => {
			event.preventDefault();
			await tick();
			document.getElementById(`${uid}-year`)?.focus();
		}}>
			<Dialog.Header class="shrink-0 text-left">
				<div class="flex items-start justify-between gap-4"><Dialog.Title class="min-w-0 break-words font-display text-xl leading-tight">{$t('academic.yearSwitcher.title')}</Dialog.Title><Button variant="ghost" size="icon" aria-label={$t('common.close')} onclick={() => changeOpen(false)}><X class="h-4 w-4" /></Button></div>
			</Dialog.Header>
			<div class="min-h-0 space-y-4 overflow-y-auto">
				<Dialog.Description>{$t('academic.yearSwitcher.description')}</Dialog.Description>
				<div class="space-y-2"><Label for={`${uid}-year`}>{$t('academic.workspaceYear')}</Label><SelectField id={`${uid}-year`} data-testid="academic-year-choice" aria-describedby={selected ? `${uid}-dates` : undefined} bind:value={selectedId} disabled={!ready || awaitingGuard} onchange={() => error = ''}>
					<option value="">{$t('academic.selectYear')}</option>
					{#each years as year (year.id)}<option value={year.id}>{$t('academic.yearSwitcher.option', { year: year.label, status: $t(`academic.yearSwitcher.status.${year.status}`) })}</option>{/each}
				</SelectField></div>
				{#if selected}<p id={`${uid}-dates`} data-testid="academic-year-dates" class="break-words text-sm text-muted-foreground">{$t('academic.yearSwitcher.dates', { start: date(selected.startDate), end: date(selected.endDate) })}</p>{/if}
				{#if !ready}<p role="status" class="text-sm text-muted-foreground">{$t('academic.yearSwitcher.loading')}</p>{/if}
				{#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
			</div>
			<Dialog.Footer class="shrink-0 border-t border-border pt-4"><Button variant="outline" onclick={() => changeOpen(false)}>{$t('common.cancel')}</Button><Button data-testid="academic-year-apply" disabled={!canSwitch} onclick={switchYear}>{$t('academic.yearSwitcher.apply')}</Button></Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
