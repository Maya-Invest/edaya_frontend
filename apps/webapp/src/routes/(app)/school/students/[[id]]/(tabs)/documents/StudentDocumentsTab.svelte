<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import {
		downloadDocumentMutation,
		retryDocumentIssuanceMutation,
	} from '$lib/api/mutations/documents.mutations';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { DOCUMENT_VOID_PERMISSION } from '$lib/documents/permissions';
	import { isDownloadableStatus, isRetryableStatus, issuanceStatusTone } from '$lib/documents/status';
	import { lang, t } from '$lib/i18n';
	import { FileText, RotateCcw } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import AnnualReportCardFormModal from '../../components/AnnualReportCardFormModal.svelte';
	import GenerateDocumentFormModal from './components/GenerateDocumentFormModal.svelte';
	import VoidDocumentFormModal from './components/VoidDocumentFormModal.svelte';
	import { getStudentDocumentsTabState } from './student-documents-tab.svelte';

	const { s }: { s: Student } = $props();

	const documentsTab = getStudentDocumentsTabState();
	const issuances = $derived(documentsTab.issuancesFor(s.id));
	const templates = $derived(documentsTab.templatesFor(s.id));

	const modals = createUrlSyncedModals({ allowed: ['generate-document', 'void-document', 'annual-report-card'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const annualOpen = bindUrlModal(modals, 'annual-report-card');
	const generateOpen = bindUrlModal(modals, 'generate-document');
	const voidOpen = bindUrlModal(modals, 'void-document');
	let voidTargetId = $state<string | null>(null);

	function titleFor(templateKey: string): string {
		const template = templates.find(entry => entry.templateKey === templateKey);
		if (!template) {
			return templateKey;
		}
		return $lang === 'en' ? template.titles.en : template.titles.fr;
	}

	function openVoid(id: string) {
		voidTargetId = id;
		voidOpen.open = true;
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between gap-3">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.tab.documents')} · {issuances.length}
		</Label>
		<PermissionGate permission="ENROLLMENT_READ" mode="disable" tooltip={$t('documents.permissionIssue')}>
			{#snippet children({ disabled, title })}
				<Button
					size="sm"
					class="rounded-full"
					{disabled}
					{title}
					data-testid="document-generate"
					onclick={() => (generateOpen.open = true)}
				>
					<FileText class="mr-1 h-4 w-4" />
					{$t('documents.generate')}
				</Button>
			{/snippet}
		</PermissionGate>
	</div>
	<Button size="sm" variant="outline" disabled={!documentsTab.annual.canAccess(s.id)} data-testid="annual-report-card-open" onclick={() => annualOpen.open = true}>{$t('reportCards.annual.title')}</Button>
	<p class="text-xs text-muted-foreground">{$t('documents.downloadRecall')}</p>
	<div class="space-y-2">
		{#if issuances.length === 0}
			<DrawerEmptyState label={$t('documents.empty')}>
				{#snippet icon()}
					<FileText class="h-5 w-5 text-muted-foreground" />
				{/snippet}
			</DrawerEmptyState>
		{:else}
			{#each issuances as issuance (issuance.id)}
				<div data-issuance-id={issuance.id} class="rounded-xl border border-border bg-card p-3">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="text-sm font-semibold">{titleFor(issuance.templateKey)}</p>
							<p class="mt-0.5 font-sans tabular-nums text-[10px] text-muted-foreground">
								{issuance.number ?? issuance.id}
							</p>
						</div>
						<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase', issuanceStatusTone[issuance.status])}>
							{$t(`documents.status.${issuance.status}`)}
						</span>
					</div>
					{#if issuance.failureCode}
						<p class="mt-1 text-xs text-destructive">{issuance.failureCode}</p>
					{/if}
					<div class="mt-3 flex flex-wrap gap-2">
						{#if isDownloadableStatus(issuance.status)}
							<Button size="sm" variant="outline" class="rounded-full" data-testid={`document-download-${issuance.id}`} onclick={() => void downloadDocumentMutation({ id: issuance.id })}>
								{$t('documents.downloadNamed', { name: titleFor(issuance.templateKey) })}
							</Button>
						{/if}
						{#if isRetryableStatus(issuance.status)}
							<Button size="sm" variant="outline" class="rounded-full" onclick={() => void retryDocumentIssuanceMutation({ issuanceId: issuance.id, successMessage: $t('documents.toastRetrying') })}>
								<RotateCcw class="mr-1 h-3.5 w-3.5" />
								{$t('documents.retry')}
							</Button>
						{/if}
						{#if issuance.status === 'ready' || issuance.status === 'failed'}
							<PermissionGate permission={DOCUMENT_VOID_PERMISSION} mode="disable" tooltip={$t('documents.permissionVoid')}>
								{#snippet children({ disabled, title })}
									<Button size="sm" variant="ghost" class="rounded-full" {disabled} {title} data-testid="document-void" onclick={() => openVoid(issuance.id)}>
										{$t('documents.void')}
									</Button>
								{/snippet}
							</PermissionGate>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<GenerateDocumentFormModal bind:open={generateOpen.open} studentId={s.id} />
<VoidDocumentFormModal bind:open={voidOpen.open} issuanceId={voidTargetId} />

<AnnualReportCardFormModal bind:open={annualOpen.open} annualState={documentsTab.annual} studentId={s.id} classId={s.classId} />
