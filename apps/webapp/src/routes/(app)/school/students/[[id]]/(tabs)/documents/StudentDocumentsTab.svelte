<script lang="ts">
	import type { DocumentIssuance, DocumentTemplateKey } from '$lib/api/documents-types';
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import DocumentIssuanceDetails from '$lib/components/school/documents/DocumentIssuanceDetails.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import { formatLocaleTimestamp } from '$lib/date/format';
	import { DOCUMENT_VOID_PERMISSION } from '$lib/documents/permissions';
	import { isDownloadableStatus, isRetryableStatus, issuanceStatusTone } from '$lib/documents/status';
	import { documentTemplateTitleKey } from '$lib/documents/titles';
	import { lang, t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import AnnualReportCardFormModal from '../../components/AnnualReportCardFormModal.svelte';
	import GenerateDocumentFormModal from './components/GenerateDocumentFormModal.svelte';
	import VoidDocumentFormModal from './components/VoidDocumentFormModal.svelte';
	import { getStudentDocumentsTabState } from './student-documents-tab.svelte';

	const { s }: { s: Student } = $props();
	const tab = getStudentDocumentsTabState();
	const templates = $derived(tab.templatesFor(s.id));
	const issuances = $derived(tab.issuancesFor(s.id).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)));
	const generatable = $derived(tab.generateTemplatesFor(s.id).map(template => template.templateKey));
	const annualKey: DocumentTemplateKey = 'annual-report-card.v1';
	const keys = $derived([...new Set([...generatable, ...(tab.annual.canAccess(s.id) ? [annualKey] : []), ...issuances.map(copy => copy.templateKey)])]);
	const modals = createUrlSyncedModals({ allowed: ['generate-document', 'void-document', 'annual-report-card'], getUrl: () => $page.url });
	$effect(() => modals.hydrate());
	const annual = bindUrlModal(modals, 'annual-report-card');
	const generate = bindUrlModal(modals, 'generate-document');
	const cancelCopy = bindUrlModal(modals, 'void-document');
	const generateKey = $derived(generatable.find(key => key === modals.target) ?? (!modals.target ? generatable[0] : undefined));
	let history = $state<{ studentId: string; key: DocumentTemplateKey } | null>(null);

	function title(key: DocumentTemplateKey) {
		return templates.find(template => template.templateKey === key)?.titles[$lang === 'en' ? 'en' : 'fr'] ?? $t(documentTemplateTitleKey(key));
	}
	function canVoid(copy: DocumentIssuance) {
		return (copy.status === 'ready' || copy.status === 'failed') && hasPermission(DOCUMENT_VOID_PERMISSION, { studentId: s.id, classId: copy.classGroupId ?? s.classId });
	}
	function canUse(copy: DocumentIssuance) {
		return tab.canIssue(s.id, copy.templateKey, copy.classGroupId ?? s.classId);
	}
</script>

{#snippet copyActions(copy: DocumentIssuance)}
	{#if isDownloadableStatus(copy.status) && canUse(copy)}
		<Button variant="ghost" data-testid={`document-download-${copy.id}`} onclick={() => tab.performDownloadDocument({ id: copy.id })}>{$t('documents.downloadNamed', { name: title(copy.templateKey) })}</Button>
	{/if}
	{#if isRetryableStatus(copy.status) && canUse(copy)}
		<Button variant="ghost" onclick={() => tab.performRetryDocumentIssuance({ issuanceId: copy.id, successMessage: $t('documents.toastRetrying') })}>{$t('documents.retry')}</Button>
	{/if}
	{#if canVoid(copy)}
		<Button variant="ghost" data-testid="document-void" onclick={() => modals.open('void-document', { target: copy.id })}>{$t('documents.void')}</Button>
	{/if}
{/snippet}

<section class="ui-student-tab-section">
	<h3 class="ui-student-section-title">{$t('drawer.tab.documents')} · {keys.length}</h3>
	<p class="text-xs text-muted-foreground">{$t('documents.downloadRecall')}</p>
	<ul class="divide-y divide-border">
		{#each keys as key (key)}
			{@const copies = issuances.filter(copy => copy.templateKey === key)}
			{@const latest = copies[0]}
			{@const canGenerate = generatable.includes(key) && tab.canIssue(s.id, key)}
			{@const missing = canGenerate && !tab.resolveSourceId(s.id, key)}
			{@const annualAction = key === annualKey && tab.annual.canAccess(s.id)}
			<li class="py-3" data-document-type={key}>
				<div class="flex items-center justify-between gap-3">
					<div class="min-w-0">
						<p class="text-sm font-semibold">{title(key)}</p>
						<span class={`rounded px-2 py-1 text-xs ${latest ? issuanceStatusTone[latest.status] : 'bg-muted text-muted-foreground'}`}>{latest ? $t(`documents.status.${latest.status}`) : $t('documents.notIssued')}</span>
						{#if missing || (!canGenerate && generatable.includes(key))}
							<p class="mt-1 text-xs text-muted-foreground">{$t(!canGenerate ? 'documents.permissionIssue' : key === 'withdrawal-certificate.v1' ? 'documents.withdrawalRequired' : 'documents.sourceMissing')}</p>
						{/if}
					</div>
					{#if canGenerate || annualAction || latest}
						<RowActionMenu label={`${$t('list.rowActions')} · ${title(key)}`}>
							{#if canGenerate}<Button variant="ghost" data-testid="document-generate" disabled={missing} onclick={() => modals.open('generate-document', { target: key })}>{$t('documents.generate')}</Button>{/if}
							{#if annualAction}<Button variant="ghost" data-testid="annual-report-card-open" onclick={() => annual.open = true}>{$t('reportCards.annual.title')}</Button>{/if}
							{#if latest}
								{@render copyActions(latest)}
								<Button variant="ghost" aria-expanded={history?.studentId === s.id && history.key === key} onclick={() => history = history?.studentId === s.id && history.key === key ? null : { studentId: s.id, key }}>{$t('documents.viewHistory')}</Button>
							{/if}
						</RowActionMenu>
					{/if}
				</div>
				{#if history?.studentId === s.id && history.key === key}
					<ul class="mt-3 space-y-2">
						{#each copies as copy (copy.id)}
							<li class="rounded-collection border p-3" data-issuance-id={copy.id}>
								<div class="flex items-center justify-between gap-2">
									<span class="text-sm">{copy.number ?? copy.id} · {$t(`documents.status.${copy.status}`)}</span>
									{#if canVoid(copy) || (canUse(copy) && (isDownloadableStatus(copy.status) || isRetryableStatus(copy.status)))}
										<RowActionMenu label={`${$t('list.rowActions')} · ${copy.number ?? copy.id}`}>{@render copyActions(copy)}</RowActionMenu>
									{/if}
								</div>
								<time class="text-xs" datetime={copy.createdAt}>{formatLocaleTimestamp(copy.createdAt, $lang) ?? $t('profile.notProvided')}</time>
								{#if copy.failureCode}<p class="text-xs text-destructive">{copy.failureCode}</p>{/if}
								<DocumentIssuanceDetails issuance={copy} />
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{:else}<li class="text-sm text-muted-foreground">{$t('documents.empty')}</li>{/each}
	</ul>
</section>
{#if generate.open && generateKey && tab.canIssue(s.id, generateKey)}
	<GenerateDocumentFormModal bind:open={generate.open} studentId={s.id} templateKey={generateKey} />
{/if}
{#if cancelCopy.open && issuances.some(copy => copy.id === modals.target && canVoid(copy))}
	<VoidDocumentFormModal bind:open={cancelCopy.open} issuanceId={modals.target} />
{/if}
{#if tab.annual.canAccess(s.id)}<AnnualReportCardFormModal bind:open={annual.open} annualState={tab.annual} studentId={s.id} classId={s.classId} />{/if}
