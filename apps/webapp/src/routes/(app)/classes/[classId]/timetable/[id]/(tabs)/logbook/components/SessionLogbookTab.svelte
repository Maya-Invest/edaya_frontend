<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { FileText } from '$lib/icons';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import PlanningSessionLogbookModal from '../../../../components/PlanningSessionLogbookModal.svelte';
	import { getPlanningState } from '../../../../planning-state.svelte';
	import { getSessionLogbookTabState } from '../session-logbook-tab.svelte';

	const { s }: { s: PlanningEvent } = $props();

	const logbookTab = getSessionLogbookTabState();
	const planning = getPlanningState();
	const isLesson = $derived(s.kind === 'lesson');
	const detail = $derived(logbookTab.detailFor(s.id));
	const logbookAuthorized = $derived(
		detail ? planning.canOpenSessionLogbook(s, Boolean(detail.logbook)) : false,
	);

	const modals = planning.modals;
	const sessionLogbookOpen = bindUrlModal(modals, 'session-logbook');
	logbookTab.configureSurfaceValidation(logbookExists =>
		planning.validateSessionLogbookSurface(s, logbookExists),
	);
</script>

{#if detail}
	<div class="space-y-4">
		<div class="flex items-center justify-between gap-2">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.tab.logbook')}
			</Label>
			{#if isLesson}
				<PermissionGate permission="CLASS_LOGBOOK_VALIDATE" classId={s.classId}><Button variant="outline" size="sm" onclick={() => logbookTab.validateLogbook([s.id])}>{$t('corrections.validateLogbook')}</Button></PermissionGate>
				<PermissionGate
					permission={detail.logbook ? 'CLASS_LOGBOOK_MANAGE' : 'CLASS_LOGBOOK_MANAGE'}
					classId={s.classId}
					mode="disable"
					tooltip="Droit cahier de texte requis."
				>
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"
							class="text-xs"
							{disabled}
							{title}
							data-testid="session-logbook-edit"
							onclick={() => modals.open('session-logbook')}
						>
							{detail.logbook ? $t('common.edit') : $t('planning.session.addLogbook')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		</div>
		{#if detail.logbook}
			<article class="rounded-collection border border-border bg-card p-4 shadow-soft">
				<div class="flex items-start justify-between gap-2">
					<h4 class="font-display text-sm font-semibold">{$t('subjects.tab.logbook')}</h4>

				</div>
				<p class="mt-2 text-xs leading-relaxed text-foreground/80">{detail.logbook.content}</p>
				{#each detail.logbook.chapters ?? [] as chapter (chapter.matterId)}
					<p>{chapter.name} · {$t(chapter.completed === null ? 'logbook.reference' : chapter.completed ? 'logbook.finished' : 'logbook.covered')}</p>
					{#if chapter.notes}<p>{chapter.notes}</p>{/if}
				{/each}

			</article>
		{:else}
			<DrawerEmptyState label={$t('planning.session.noLogbook')}>
				{#snippet icon()}
					<FileText class="h-5 w-5 text-muted-foreground" />
				{/snippet}
			</DrawerEmptyState>
			{#if isLesson}
				<PermissionGate
					permission="CLASS_LOGBOOK_MANAGE"
					classId={s.classId}
					mode="disable"
					tooltip="Droit CLASS_LOGBOOK_MANAGE requis."
				>
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"

							{disabled}
							{title}
							data-testid="session-logbook-edit"
							onclick={() => modals.open('session-logbook')}
						>
							{$t('planning.session.addLogbook')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		{/if}
	</div>

	{#if logbookAuthorized}
		<PlanningSessionLogbookModal {detail} bind:open={sessionLogbookOpen.open} showTrigger={false} onLoad={id => logbookTab.loadLogbook(id)} onSave={input => logbookTab.saveLogbook(input)} />
	{/if}
{/if}
