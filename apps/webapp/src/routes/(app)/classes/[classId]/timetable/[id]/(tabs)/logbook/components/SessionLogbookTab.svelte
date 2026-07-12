<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import type { SessionDetail } from '$lib/types/session-detail';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import PlanningSessionLogbookModal from '$lib/components/school/scheduling/PlanningSessionLogbookModal.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { t } from '$lib/i18n';
	import { Check, FileText } from '$lib/icons';
	import { getSessionLogbookTabState } from '../session-logbook-tab.svelte';

	const { s }: { s: PlanningEvent } = $props();

	const logbookTab = getSessionLogbookTabState();
	const isLesson = $derived(s.kind === 'lesson');
	const detail = $derived(logbookTab.detailFor(s.id));

	type SessionDrawerModal = 'session-logbook';

	const modals = createUrlSyncedModals<SessionDrawerModal>({
		allowed: ['session-logbook'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const sessionLogbookOpen = bindUrlModal(modals, 'session-logbook');

	async function saveLogbook(input: {
		sessionId: string;
		classGroupId: string;
		classSubjectId: string;
		date: string;
		logbookId?: string;
		classSubjectMatterId: string;
		chapter: string;
		content: string;
		objectives: string[];
		homework?: string;
		progress: number;
		successMessage?: string;
	}) {
		return logbookTab.saveLogbook(input);
	}
</script>

{#if detail}
	<div class="space-y-4">
		<div class="flex items-center justify-between gap-2">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.tab.logbook')}
			</Label>
			{#if isLesson}
				<PermissionGate
					permission={detail.logbook ? 'CLASS_LOGBOOK_UPDATE' : 'CLASS_LOGBOOK_CREATE'}
					classId={s.classId}
					mode="disable"
					tooltip="Droit cahier de texte requis."
				>
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"
							class="h-7 rounded-full text-xs"
							{disabled}
							{title}
							onclick={() => modals.open('session-logbook')}
						>
							{detail.logbook ? $t('common.edit') : $t('planning.session.addLogbook')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		</div>
		{#if detail.logbook}
			<article class="rounded-2xl border border-border bg-card p-4 shadow-soft">
				<div class="flex items-start justify-between gap-2">
					<h4 class="font-display text-sm font-semibold">{detail.logbook.chapter}</h4>
					{#if isLesson}
						<span class="font-mono text-[10px] text-muted-foreground">{detail.logbook.progress}%</span>
					{/if}
				</div>
				<p class="mt-2 text-xs leading-relaxed text-foreground/80">{detail.logbook.content}</p>
				{#if isLesson && detail.logbook.objectives.length > 0}
					<ul class="mt-2 space-y-1">
						{#each detail.logbook.objectives as objective (objective)}
							<li class="flex items-start gap-1.5 text-[11px]">
								<Check class="mt-0.5 h-3 w-3 text-accent" />
								{objective}
							</li>
						{/each}
					</ul>
				{/if}
				{#if detail.logbook.homework}
					<p class="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
						<FileText class="h-3 w-3" />
						<span class="font-medium text-foreground">{$t('teaching.homework')} :</span>
						{detail.logbook.homework}
					</p>
				{/if}
			</article>
		{:else}
			<DrawerEmptyState label={$t('planning.session.noLogbook')}>
				{#snippet icon()}
					<FileText class="h-5 w-5 text-muted-foreground" />
				{/snippet}
			</DrawerEmptyState>
			{#if isLesson}
				<PermissionGate
					permission="CLASS_LOGBOOK_CREATE"
					classId={s.classId}
					mode="disable"
					tooltip="Droit CLASS_LOGBOOK_CREATE requis."
				>
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"
							class="rounded-full"
							{disabled}
							{title}
							onclick={() => modals.open('session-logbook')}
						>
							{$t('planning.session.addLogbook')}
						</Button>
					{/snippet}
				</PermissionGate>
			{/if}
		{/if}
	</div>

	<PlanningSessionLogbookModal {detail} bind:open={sessionLogbookOpen.open} showTrigger={false} onSave={saveLogbook} />
{/if}
