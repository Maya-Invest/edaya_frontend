<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import ReportCardAvailabilityNotice from '$lib/components/school/report-cards/ReportCardAvailabilityNotice.svelte';
	import SubjectReportCommentModal from '$lib/components/school/report-cards/SubjectReportCommentModal.svelte';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { lang, t } from '$lib/i18n';
	import { FileSpreadsheet } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { nestedRouteSurfaceHistoryState } from '$lib/navigation/route-surface-history';
	import { hasPermission } from '$lib/permissions';
	import { toast } from '$lib/toast.svelte';
	import { formatReportMark, formatSectionRank, formatReportRank } from '$lib/types/report-cards';
	import { get } from 'svelte/store';
	import AnnualReportCardFormModal from '../../components/AnnualReportCardFormModal.svelte';
	import { readReportSelection, reportPublicationBlocked, reportStatusDate } from './report-selection';
	import { getStudentReportCardTabState } from './student-report-card-tab.svelte';

	const { s }: { s: Student } = $props();
	const reportCardTab = getStudentReportCardTabState();
	const modals = createUrlSyncedModals({ allowed: ['annual-report-card', 'report-comments'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const subjectCommentOpen = bindUrlModal(modals, 'report-comments');
	const annualOpen = bindUrlModal(modals, 'annual-report-card');
	const results = $derived(reportCardTab.reportCardResultsFor(s.id));
	const periods = $derived(reportCardTab.annual.periods);
	const selection = $derived(readReportSelection($page.url, periods, results, academicContext.periodId));
	const stored = $derived(selection.result);
	const reviewingDraft = $derived($page.url.searchParams.get('reportVersion') === 'draft' && Boolean(stored?.revisedDraft));
	const latest = $derived(reviewingDraft ? stored?.revisedDraft : stored);
	const annual = $derived(selection.annual);
	const regularPeriods = $derived(periods.filter(period => !selection.annualTargets.some(target => target.id === period.id)));
	const context = $derived({ studentId: s.id, classId: latest?.classId || s.classId });
	const canGenerate = $derived(hasPermission('REPORT_CARD_GENERATE', context));
	const canPublish = $derived(hasPermission('REPORT_CARD_PUBLISH', context));
	const canPrepare = $derived(canGenerate && (stored?.status !== 'published' || canPublish));
	const canExport = $derived(hasPermission('REPORT_CARD_EXPORT', context));
	const canComment = $derived(hasPermission('REPORT_CARD_REVIEW_COMMENTS', context) && stored?.status !== 'published');
	const annualRaw = $derived(annual ? reportCardTab.annual.results.find(result => result.id === latest?.id) : undefined);
	const annualReady = $derived(Boolean(annualRaw && reportCardTab.annual.readyForPublication(annualRaw)));
	const blocked = $derived(latest ? reportPublicationBlocked(latest) : false);
	const statusDate = $derived(latest && reportStatusDate(latest));
	const pickerId = $props.id();
	let commentDraft = $derived(latest?.homeroomComment ?? '');
	let commentBusy = $state(false);
	let busy = $state(false);

	async function select(value: string, target = '') {
		const url = new URL($page.url);
		url.searchParams.set('reportPeriod', value);
		url.searchParams.delete('reportVersion');
		if (target)
			url.searchParams.set('annualTarget', target);
		else url.searchParams.delete('annualTarget');
		await appGoto(`${url.pathname}${url.search}${url.hash}`, { noScroll: true, keepFocus: true, state: nestedRouteSurfaceHistoryState($page.state) });
	}
	async function reviewDraft(draft: boolean) {
		const url = new URL($page.url);
		if (draft)
			url.searchParams.set('reportVersion', 'draft');
		else url.searchParams.delete('reportVersion');
		await appGoto(`${url.pathname}${url.search}${url.hash}`, { noScroll: true, keepFocus: true, state: nestedRouteSurfaceHistoryState($page.state) });
	}
	async function generate() {
		if (annual) {
			annualOpen.open = true;
			return;
		}
		busy = true;
		try {
			if (await reportCardTab.generateReportCard(s.id, selection.periodId))
				toast.success(get(t)('reportCards.toastGenerated', { name: s.name }));
		}
		finally { busy = false; }
	}
	async function publish() {
		if (!latest)
			return;
		if (annual) {
			annualOpen.open = true;
			return;
		}
		busy = true;
		try {
			if (await reportCardTab.publishReportCard({ resultId: latest.id, studentId: latest.studentId, periodId: latest.academicPeriodId, reviewedRevision: reviewingDraft }))
				toast.success(get(t)('reportCards.toastPublished', { name: s.name }));
		}
		finally { busy = false; }
	}
	async function pdf() {
		if (!latest || busy)
			return;
		busy = true;
		try {
			if (annual) {
				const raw = reportCardTab.annual.results.find(result => result.id === latest.id);
				if (raw)
					await reportCardTab.annual.issue(raw);
			}
			else {
				await reportCardTab.performRequestDocumentIssuance({ templateKey: 'report-card.v1', sourceId: latest.id, studentId: s.id, classGroupId: latest.classId, academicYearId: latest.academicYearId, academicPeriodId: latest.academicPeriodId, locale: get(lang), successMessage: get(t)('documents.toastRequested') });
			}
		}
		finally { busy = false; }
	}
	async function saveHomeroomComment() {
		if (!latest || !canComment)
			return;
		commentBusy = true;
		try {
			const ok = await reportCardTab.performWriteHomeroomReportComment({ resultId: latest.id, expectedVersion: latest.version ?? 0, teacherComment: commentDraft, successMessage: get(t)('reportCards.homeroomCommentSaved') });
			if (ok)
				await reportCardTab.refreshResults(s.id);
		}
		finally { commentBusy = false; }
	}
</script>

<div class="min-w-0" data-testid="student-report-card">
	<div class="ui-student-tab-section">
		<div class="flex flex-wrap items-center justify-between gap-4" data-testid="report-toolbar">
			<div class="flex min-w-0 max-w-full flex-wrap items-center gap-2">
				<label for={pickerId} class="text-xs font-medium text-muted-foreground">{$t('reportCards.period')}</label>
				<Select.Root type="single" value={annual ? 'annual' : selection.periodId} onValueChange={value => value && void select(value)}>
					<Select.Trigger id={pickerId} data-testid="report-period-trigger" class="w-auto min-w-36 max-w-full" aria-label={$t('academic.selectPeriod')}>
						<span>{annual ? $t('reportCards.annualResult') : periods.find(period => period.id === selection.periodId)?.label ?? '—'}</span>
					</Select.Trigger>
					<Select.Content class="z-[100]">{#each regularPeriods as period (period.id)}<Select.Item value={period.id} label={period.label}>{period.label}</Select.Item>{/each}<Select.Item value="annual" label={$t('reportCards.annualResult')}>{$t('reportCards.annualResult')}</Select.Item></Select.Content>
				</Select.Root>
			</div>
			{#if stored?.revisedDraft || canPrepare || (latest && ((latest.status !== 'published' && canPublish) || (latest.status === 'published' && canExport)))}
				<div class="ml-auto" data-testid="report-actions">
					<RowActionMenu triggerLabel={$t('reportCards.actions')}>
						{#if stored?.revisedDraft}<RowActionMenuItem disabled={busy} onclick={() => void reviewDraft(!reviewingDraft)}>{$t(reviewingDraft ? 'reportCards.viewPublished' : 'reportCards.reviewDraft')}</RowActionMenuItem>{/if}
						{#if canPrepare}<RowActionMenuItem disabled={busy || selection.ambiguous || (!annual && !selection.periodId) || (annual && selection.annualTargets.length > 1 && !selection.periodId)} onclick={() => void generate()}>{$t(latest ? 'reportCards.regenerateAction' : 'reportCards.generate')}</RowActionMenuItem>{/if}
						{#if latest && latest.status !== 'published' && canPublish}<RowActionMenuItem disabled={busy || blocked} onclick={() => void publish()}>{$t('reportCards.publish')}</RowActionMenuItem>{/if}
						{#if latest?.status === 'published' && canExport}<RowActionMenuItem disabled={busy || (annual && !annualReady)} title={annual && !annualReady ? $t('reportCards.annual.prerequisites') : undefined} onclick={() => void pdf()}>{$t('documents.generatePdf')}</RowActionMenuItem>{/if}
					</RowActionMenu>
				</div>
			{/if}
		</div>
		{#if annual && selection.annualTargets.length > 1}
			<div class="space-y-2">
				<label for={`${pickerId}-target`} class="text-sm">{$t('reportCards.annual.target')}</label>
				<Select.Root type="single" value={selection.periodId} onValueChange={value => value && void select('annual', value)}>
					<Select.Trigger id={`${pickerId}-target`} data-testid="report-annual-target"><span>{periods.find(period => period.id === selection.periodId)?.label ?? $t('reportCards.annual.chooseTarget')}</span></Select.Trigger>
					<Select.Content class="z-[100]">{#each selection.annualTargets as target (target.id)}<Select.Item value={target.id} label={target.label}>{target.label} · {target.range}</Select.Item>{/each}</Select.Content>
				</Select.Root>
			</div>
		{/if}
	</div>
	{#if !latest}
		<div class="ui-student-tab-section">
			<DrawerEmptyState label={$t(selection.ambiguous ? 'reportCards.annual.targetConflict' : annual && selection.annualTargets.length > 1 ? 'reportCards.annual.chooseTarget' : annual ? 'reportCards.emptyAnnual' : 'reportCards.emptyStudent')}>
				{#snippet icon()}<FileSpreadsheet class="h-5 w-5 text-muted-foreground" />{/snippet}
			</DrawerEmptyState>
		</div>
	{:else}
		<div class="ui-student-tab-section">
			<div class="report-summary" data-testid="report-summary">
				<div class="report-metric"><p class="text-xs text-muted-foreground">{latest.aggregateLabel ?? $t('reportCards.overallResult')}</p><p class="font-display text-2xl font-semibold">{formatReportMark(latest.grading, latest.overallAverage)}</p>{#if latest.grading?.mode === 'numeric-first'}<p class="text-sm">{latest.grading.mention.label}</p>{/if}</div>
				<div class="report-metric"><p class="text-xs text-muted-foreground">{$t('reportCards.summaryRank')}</p><p class="font-display text-2xl font-semibold">{formatReportRank(latest)}</p></div>
				<div class="report-metric" data-testid="report-status"><p class="text-xs text-muted-foreground">{$t('reportCards.status')}</p><p class="font-display text-lg font-semibold">{$t(latest.status === 'published' ? 'reportCards.statusPublished' : latest.status === 'generated' ? 'reportCards.statusGenerated' : 'reportCards.statusDraft')}</p><p class="text-xs text-muted-foreground">{statusDate ? formatLocaleDate(statusDate, $lang, { year: 'numeric', month: 'short', day: 'numeric' }) : $t('reportCards.dateMissing')}</p></div>
			</div>
			<ReportCardAvailabilityNotice results={[latest]} showMissingValues={false} />
			{#if annual && !annualReady}<p role="status" class="text-sm">{$t('reportCards.annual.prerequisites')}</p>{/if}
			{#if latest.calculationStale}<p role="status" class="text-sm">{$t('reportCards.staleMarks')}</p>{/if}
			{#if latest.pendingAssessmentIds?.length}<p role="status" class="text-sm">{$t('reportCards.pendingSubmissions', { count: String(latest.pendingAssessmentIds.length) })}</p>{/if}
			{#if latest.pendingCorrectionIds?.length}<p role="status" class="text-sm">{$t('reportCards.pendingCorrections', { count: String(latest.pendingCorrectionIds.length) })}</p>{/if}
			{#if stored?.revisedDraft}<p role="status" class="text-sm">{#if reviewingDraft}{$t('grading.revisedDraft')} · {/if}{$t('grading.publishedPreserved')}</p>{/if}
		</div>
		{#each latest.sectionResults as section (section.sectionId)}
			<div class="ui-student-tab-section">
				<h3 class="ui-student-section-title">{section.name || $t('profile.notProvided')}</h3>
				{#if section.sectionKind === 'module'}
					<div class="flex flex-wrap gap-x-4 gap-y-2 text-sm" data-testid="report-module-summary">
						<span>{$t('reportCards.coefficient')}: {section.weight ?? '—'}</span>
						<span>{$t('reportCards.overall')}: {formatReportMark(section.grading, section.sectionAverage)}</span>
						<span>{$t('reportCards.summaryRank')}: {formatSectionRank(section)}</span>
						<span>{$t('reportCards.appreciation')}: {section.grading?.mention.label ?? '—'}</span>
					</div>
					{#if section.comment}<p class="whitespace-pre-wrap break-words text-sm text-muted-foreground">{section.comment}</p>{/if}
				{/if}
				<ul class="space-y-2">
					{#each section.marks as mark (mark.subjectId)}
						<li id={`report-subject-${mark.sectionId}`} class="min-w-0 rounded-collection border border-border/60 px-3 py-2 text-sm" data-testid="report-subject">
							<div class="flex flex-wrap items-start justify-between gap-4">
								<div class="min-w-0 flex-1">
									<p class="break-words font-medium">{mark.subjectName}</p>
									<p class="text-xs text-muted-foreground">{$t('reportCards.coefficient')}: {mark.coefficient ?? '—'} · {$t('reportCards.summaryRank')}: {formatSectionRank(mark)}</p>
								</div>
								<div class="min-w-0 max-w-full text-right">
									<p class="font-sans tabular-nums font-medium">{formatReportMark(mark.grading, mark.average)}</p>
									{#if mark.grading?.mode === 'numeric-first'}<p class="break-words text-xs text-muted-foreground">{mark.grading.mention.label}</p>{/if}
								</div>
								{#if canComment && mark.sectionId}<RowActionMenu label={`${$t('list.rowActions')} · ${mark.subjectName}`}><RowActionMenuItem onclick={() => modals.open('report-comments', { target: mark.sectionId })}>{$t(mark.comment ? 'reportCards.editSubjectComment' : 'reportCards.addSubjectComment')}</RowActionMenuItem></RowActionMenu>{/if}
							</div>
							{#if mark.comment}<p class="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground"><span class="font-medium">{mark.teacherName || $t('reportCards.teacherLabel')}:</span> {mark.comment}</p>{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
		<SubjectReportCommentModal bind:open={subjectCommentOpen.open} result={latest} sectionId={modals.target ?? ''} canEdit={canComment} onSave={reportCardTab.performWriteReportSectionComments} onSaved={() => reportCardTab.refreshResults(s.id)} />

		<div class="ui-student-tab-section">
			<h3 class="ui-student-section-title">
				{$t('reportCards.homeroomComment')}
			</h3>
			<Textarea bind:value={commentDraft} rows={3} readonly={!canComment || latest.status === 'published'} />
			{#if canComment}<Button size="sm" disabled={commentBusy || latest.status === 'published'} onclick={() => void saveHomeroomComment()}>
				{$t('reportCards.saveHomeroomComment')}
			</Button>{/if}
		</div>

		{#if latest.principalComment}
			<div class="ui-student-tab-section">
				<h3 class="ui-student-section-title">
					{$t('reportCards.principalComment')}
				</h3>
				<p class="mt-1 text-sm">{latest.principalComment}</p>
			</div>
		{/if}

	{/if}
</div>

<AnnualReportCardFormModal bind:open={annualOpen.open} annualState={reportCardTab.annual} studentId={s.id} classId={latest?.classId || s.classId} initialTargetId={annual ? selection.periodId : ''} onSaved={() => reportCardTab.refreshResults(s.id)} />

<style>
	.report-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr)); gap:16px; }
	.report-metric { min-width:0; overflow-wrap:anywhere; border:1px solid hsl(var(--border)); border-radius:var(--radius-collection); background:hsl(var(--secondary) / .3); padding:16px; text-align:center; display:flex; flex-direction:column; gap:8px; }
</style>
