<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import { page } from '$app/stores';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import TableTimestamp from '$lib/components/ui/TableTimestamp.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t, locale } from '$lib/i18n';
	import { AlertTriangle, ArrowLeft, X } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { closeDetailDrawer, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { toast } from '$lib/toast.svelte';
	import { BADGE, BADGE_INFO, BADGE_SUCCESS, BADGE_WARN, BADGE_DANGER } from '$lib/ui-tones';
	import { correctionDiff, correctionRevisionDiff } from '../correction-diff';
	import { CorrectionsPageState } from '../corrections-page.svelte';

	const queue = new CorrectionsPageState();
	let busy = $state(false);
	const documentOutcome = $derived(queue.detail?.original?.documentOutcome as {
		issuanceId: string;
		status: string;
		failureCode?: string;
	} | undefined);
	let rejectionReason = $state('');
	let findingNext = $state(false);
	const nextPending = $derived(queue.items.find(item => item.id !== queue.detail?.correction.id && item.status === 'pending'));
	const canFindNext = $derived(Boolean(nextPending) || (queue.hasMore && ($page.url.searchParams.get('status') || 'pending') === 'pending'));
	async function openNextPending() {
		if (findingNext || busy)
			return;
		findingNext = true;
		try {
			while (queue.hasMore && !queue.loadMoreError) {
				if (queue.items.some(item => item.id !== queue.detail?.correction.id && item.status === 'pending'))
					break;
				const before = queue.items.length;
				await queue.loadMore();
				if (queue.items.length === before)
					break;
			}
			if (nextPending)
				navigate('correction', nextPending.id, false);
		}
		finally { findingNext = false; }
	}
	const searchFilter = new ListFiltersState({
		getUrl: () => $page.url,
		write: (url, values) => {
			const next = new URL(url);
			if (values.search.trim())
				next.searchParams.set('search', values.search.trim());
			else
				next.searchParams.delete('search');
			for (const key of ['offset', 'correction', 'action'])
				next.searchParams.delete(key);
			return next.pathname + next.search;
		},
		goto: href => void appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
	}, () => ({ search: $page.url.searchParams.get('search') || '' }));
	$effect(() => searchFilter.hydrate({ search: $page.url.searchParams.get('search') || '' }));
	const columns = $derived([
		{ key: 'request', label: $t('corrections.request'), span: 5, minWidth: 240, required: true },
		{ key: 'target', label: $t('corrections.studentClass'), span: 3, minWidth: 168 },
		{ key: 'requester', label: $t('corrections.requester'), span: 3, minWidth: 152 },
		{ key: 'workflow', label: $t('corrections.workflowLabel'), span: 2.5, minWidth: 144 },
		{ key: 'submitted', label: $t('corrections.submittedAt'), span: 2.5, minWidth: 152 },
		{ key: 'status', label: $t('common.status'), span: 2, minWidth: 144 },
	]);
	const activeFilters = $derived(Number(($page.url.searchParams.get('status') || 'pending') !== 'pending') + ['classGroupId', 'teacherSubjectId', 'studentId', 'from', 'to'].filter(key => $page.url.searchParams.get(key)).length);
	const statusTone: Record<string, string> = { pending: BADGE_WARN, approved: BADGE_SUCCESS, approved_pending_publication: BADGE_INFO, published: BADGE_SUCCESS, rejected: BADGE_DANGER, withdrawn: BADGE };
	const workflow = $derived($page.url.searchParams.get('workflow') || '');
	const status = $derived($page.url.searchParams.get('status') || 'pending');
	const action = $derived($page.url.searchParams.get('action') || '');
	const workflows = $derived(['', 'grades', 'attendance', 'report_comments', 'logbook', 'discipline'].map(value => ({ value, label: $t(`corrections.workflow.${value || 'all'}`) })));
	const statuses = $derived(['pending', 'approved_pending_publication', 'published', 'approved', 'rejected', 'withdrawn'].map(value => ({ value, label: $t(`marks.${value}`) })));
	const diffs = $derived(queue.detail ? correctionDiff(queue.detail, $t) : []);
	const consequences = $derived(queue.detail?.correction.workflow === 'grades' ? [] : queue.detail?.correction.consequences ?? []);
	function navigate(key: string, value: string, reset = true) {
		const url = new URL($page.url);
		if (value)
			url.searchParams.set(key, value);
		else
			url.searchParams.delete(key);
		if (key === 'correction' && !value)
			url.searchParams.delete('action');
		if (reset) {
			url.searchParams.delete('offset');
			url.searchParams.delete('correction');
			url.searchParams.delete('action');
		}
		if (key === 'correction' && value)
			openDetailDrawer(url.pathname + url.search, $page.url.pathname + $page.url.search);
		else if (key === 'correction')
			closeDetailDrawer(url.pathname + url.search);
		else
			void appGoto(url.pathname + url.search, { keepFocus: true, noScroll: true });
	}
	async function decide(decision: 'approve' | 'reject' | 'publish' | 'withdraw', confirmed = false) {
		const detail = queue.detail;
		if (!detail || detail.correction.id !== $page.url.searchParams.get('correction') || busy || !detail.allowedActions[decision])
			return;
		if (decision === 'approve' && consequences.some(value => value !== 'review_discipline_outcomes') && !confirmed) {
			navigate('action', 'approve', false);
			return;
		}
		busy = true;
		try {
			if (!await queue.decide(decision, rejectionReason, confirmed, $t))
				return;
			rejectionReason = '';
			const url = new URL($page.url);
			url.searchParams.delete('action');
			url.searchParams.delete('correction');
			url.searchParams.set('refresh', String(Date.now()));
			await appGoto(url.pathname + url.search, { keepFocus: true, noScroll: true });
		}
		catch (error) {
			toast.error(error instanceof Error ? error.message : $t('corrections.error'));
		}
		finally {
			busy = false;
		}
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={activeFilters + Number(Boolean(workflow))}
		onResetFilters={() => {
			const url = new URL($page.url);
			for (const key of ['workflow', 'status', 'classGroupId', 'teacherSubjectId', 'studentId', 'from', 'to', 'offset', 'correction', 'action']) url.searchParams.delete(key);
			void appGoto(url.pathname + url.search, { replaceState: true, keepFocus: true, noScroll: true });
		}} eyebrow={queue.hasLoadedList ? $t('corrections.title') : undefined} title={queue.hasLoadedList ? $t(queue.total === 1 ? 'corrections.countOne' : 'corrections.count', { n: queue.total }) : $t('corrections.title')}>
		{#snippet search()}
			<ListSearchField value={searchFilter.values.search} oninput={event => searchFilter.patch({ search: event.currentTarget.value })} placeholder={$t('corrections.search')} onCommit={() => searchFilter.syncNow()} />
		{/snippet}
		{#snippet filters()}
			<div class="space-y-2"><Label for="correction-workflow">{$t('corrections.workflowLabel')}</Label><FilterSelect id="correction-workflow" class="h-9 w-full" aria-label={$t('corrections.workflowLabel')} value={workflow} options={workflows} onchange={value => navigate('workflow', value)} /></div>
			<FilterPanel activeCount={activeFilters} class="border-input bg-background">
				<div class="space-y-2"><Label for="correction-status">{$t('corrections.statusLabel')}</Label><FilterSelect id="correction-status" aria-label={$t('corrections.statusLabel')} class="h-9 w-full" value={status} options={statuses} onchange={value => navigate('status', value)} /></div>
				<div class="space-y-2"><Label for="correction-class">{$t('corrections.class')}</Label><FilterSelect id="correction-class" aria-label={$t('corrections.class')} class="h-9 w-full" value={$page.url.searchParams.get('classGroupId') || ''} options={[{ value: '', label: $t('filter.all') }, ...queue.filters.classes]} onchange={value => navigate('classGroupId', value)} /></div>
				<div class="space-y-2"><Label for="correction-teacher">{$t('corrections.teacher')}</Label><FilterSelect id="correction-teacher" aria-label={$t('corrections.teacher')} class="h-9 w-full" value={$page.url.searchParams.get('teacherSubjectId') || ''} options={[{ value: '', label: $t('filter.all') }, ...queue.filters.teachers]} onchange={value => navigate('teacherSubjectId', value)} /></div>
				<div class="space-y-2"><Label for="correction-student">{$t('corrections.student')}</Label><FilterSelect id="correction-student" aria-label={$t('corrections.student')} class="h-9 w-full" value={$page.url.searchParams.get('studentId') || ''} options={[{ value: '', label: $t('filter.all') }, ...queue.filters.students]} onchange={value => navigate('studentId', value)} /></div>
				<div class="space-y-2"><Label for="correction-from">{$t('corrections.from')}</Label><Input id="correction-from" type="date" value={$page.url.searchParams.get('from') || ''} onchange={event => navigate('from', event.currentTarget.value)} /></div>
				<div class="space-y-2"><Label for="correction-to">{$t('corrections.to')}</Label><Input id="correction-to" type="date" value={$page.url.searchParams.get('to') || ''} onchange={event => navigate('to', event.currentTarget.value)} /></div>
			</FilterPanel>
		{/snippet}
		{#snippet context()}
			{#if workflow === 'grades' || workflow === 'report_comments'}<AcademicPeriodSelector />{/if}
		{/snippet}
	</ListPageHeader>
	<PageQuery query={queue.query} cacheKey={url => url.pathname + url.search} cache={false} preserveWhileLoading loadingTitle={$t('corrections.title')}>
		{#snippet children(data)}
			<DataState status={queue.listLoading ? 'ready' : data.status} errorMessage={data.errorMessage}>
				<ListEntityTable listKey="CorrectionsView:v2" {columns} rows={queue.items} highlightId={$page.url.searchParams.get('correction') ?? undefined} hasMore={queue.hasMore} loading={queue.listLoading} loadingMore={queue.loadingMore} total={queue.total} visibleCount={queue.items.length} onLoadMore={() => void queue.loadMore()} onRowClick={item => navigate('correction', item.id, false)} emptyLabel={$t('dataState.emptyTitle')}>
					{#snippet cell(item, column, _ctx)}

						{#if column.key === 'request'}
							<div class="min-w-0">
								<p class="break-words text-sm font-medium">{item.title || $t('value.notProvided')}</p>
								{#if 'consequences' in item}
									{#each item.consequences as consequence (consequence)}
										<p class="mt-1 flex items-start gap-2 text-xs font-normal text-highlight"><AlertTriangle class="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /><span>{$t(`corrections.impact.${consequence}`)}</span></p>
									{/each}
								{/if}
							</div>
						{:else if column.key === 'target'}
							<div class="min-w-0 text-sm">
								{#if item.students.length === 1}<p class="break-words">{item.students[0].name || $t('value.notProvided')}</p>
								{:else if item.students.length > 1}<p>{$t('corrections.studentCount', { n: item.students.length })}</p>{/if}
								<p class={item.students.length ? 'mt-1 break-words text-xs text-muted-foreground' : 'break-words'}>{item.className || $t('value.notProvided')}</p>
							</div>
						{:else if column.key === 'requester'}
							<p class="break-words text-sm">{item.teacherName || $t('value.notProvided')}</p>
						{:else if column.key === 'workflow'}
							<p class="text-sm">{$t(`corrections.workflow.${item.workflow}`)}</p>
						{:else if column.key === 'submitted'}
							<TableTimestamp value={item.createdAt} />
						{:else if column.key === 'status'}
							<span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[item.status] ?? BADGE}`}>{$t(`corrections.status.${item.status}`)}</span>
						{/if}
					{/snippet}
				</ListEntityTable>
				{#if queue.loadMoreError}<Button variant="outline" onclick={() => {
					queue.loadMoreError = false;
					void queue.loadMore();
				}}>{$t('dataState.retry')}</Button>{/if}
			</DataState>
		{/snippet}
	</PageQuery>
</div>
{#snippet secondaryActions()}
	{#if queue.detail?.allowedActions.withdraw}<Button class="h-auto w-full whitespace-normal" variant="ghost" disabled={busy} onclick={() => navigate('action', 'withdraw', false)}>{$t('marks.withdraw')}</Button>{/if}
	{#if queue.detail?.allowedActions.publish}<Button class="h-auto w-full whitespace-normal" variant="ghost" disabled={busy} onclick={() => navigate('action', 'publish', false)}>{$t('marks.publish')}</Button>{/if}
{/snippet}
{#if queue.detail && $page.url.searchParams.get('correction')}
	<DrawerFrame label={$t('corrections.title')} closeDisabled={busy} onClose={() => navigate('correction', '', false)} testId="correction-drawer">
		<div class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4 md:px-6">{#if $page.state.routeSurfaceParent?.startsWith('/school/corrections?') && $page.state.routeSurfaceParent.includes('correction=')}<Button variant="ghost" size="icon" disabled={busy} aria-label={$t('common.back')} onclick={() => closeDetailDrawer($page.state.routeSurfaceParent!)}><ArrowLeft class="h-4 w-4" /></Button>{/if}<span class="min-w-0 flex-1 text-sm font-medium">{$t('corrections.title')}</span><Button class="h-auto whitespace-normal" variant="outline" disabled={busy || findingNext || queue.loadingMore || queue.detail?.correction.id !== $page.url.searchParams.get('correction') || !canFindNext} aria-describedby={!canFindNext ? 'no-next-correction' : undefined} onclick={openNextPending}>{$t('corrections.nextPending')}</Button>{#if !canFindNext}<p id="no-next-correction" class="basis-full text-xs text-muted-foreground">{$t('corrections.noNextPending')}</p>{/if}<Button variant="ghost" size="icon" aria-label={$t('common.close')} onclick={() => navigate('correction', '', false)} disabled={busy}><X class="h-4 w-4" /></Button></div>
		<div class="min-h-0 flex-1 space-y-6 overflow-y-auto break-words p-4 md:p-6">
			{#if queue.detail.correction.id === $page.url.searchParams.get('correction')}
				<DrawerEntityHeader name={$t(`corrections.workflow.${queue.detail.correction.workflow}`)} overflow={queue.detail.allowedActions.withdraw || queue.detail.allowedActions.publish ? secondaryActions : undefined} summary={`${queue.detail.context.teacherName || $t('corrections.teacher')} · ${queue.detail.context.className}`}>
					{#snippet chips()}{#if queue.detail}<span class={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[queue.detail.correction.status] ?? BADGE}`}>{$t(`marks.${queue.detail.correction.status}`)}</span>{/if}{/snippet}
					{#snippet actions()}
						{#if queue.detail?.allowedActions.approve}<Button class="h-auto whitespace-normal" disabled={busy} onclick={() => decide('approve')}>{$t('marks.approve')}</Button>{/if}
						{#if queue.detail?.allowedActions.reject}<Button class="h-auto whitespace-normal" variant="outline" disabled={busy} onclick={() => navigate('action', 'reject', false)}>{$t('marks.reject')}</Button>{/if}
					{/snippet}

				</DrawerEntityHeader>
				<section><h3 class="mb-2 text-sm font-semibold">{$t('corrections.context')}</h3><p>{queue.detail.context.students.map(student => student.name).join(', ') || queue.detail.context.className}</p><p class="mt-2 text-xs text-muted-foreground">{new Date(queue.detail.correction.createdAt).toLocaleString($locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</p></section>
				<h3 class="text-sm font-semibold">{$t('corrections.comparison')}</h3>
				<div class="space-y-4">{#each diffs as diff, index (`${diff.label}-${index}`)}<section><h3 class="mb-2 text-sm font-semibold">{diff.label}</h3><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><div class="border-l-2 border-border pl-3"><p class="mb-1 text-xs text-muted-foreground">{$t('corrections.official')}</p><p class="whitespace-pre-wrap">{diff.before}</p></div><div class="border-l-2 border-primary/30 pl-3"><p class="mb-1 text-xs text-primary">{$t('corrections.proposed')}</p><p class="whitespace-pre-wrap">{diff.proposed}</p></div></div></section>{/each}</div>
				<section class="border-t pt-6"><h3 class="mb-2 text-sm font-semibold">{$t('corrections.reason')}</h3><p class="whitespace-pre-wrap">{queue.detail.correction.reason}</p></section>
				<h3 class="text-sm font-semibold">{$t('corrections.consequences')}</h3>{#if !consequences.length}<p class="text-sm text-muted-foreground">{$t('corrections.noConsequences')}</p>{/if}
				{#each consequences as consequence (consequence)}<p class="border-l-2 border-border pl-3 text-sm">{$t(`corrections.consequence.${consequence}`)}</p>{/each}
				{#if documentOutcome}<p class="border-l-2 border-border pl-3" role="status">{$t(`corrections.document.${documentOutcome.status}`)}</p>{#if documentOutcome.status === 'failed'}<Button disabled={busy} onclick={async () => {
					busy = true;
					try {
						if (await queue.retryDocument(documentOutcome!.issuanceId))
							navigate('refresh', String(Date.now()), false);
					}
					finally {
						busy = false;
					}
				}}>{$t('dataState.retry')}</Button>{/if}{/if}
				{#if queue.detail.correction.rejectionReason}<p>{$t('corrections.rejectionReason')}: {queue.detail.correction.rejectionReason}</p>{/if}
				{#if queue.detail.correction.decidedAt}<p class="text-sm">{$t(`marks.${queue.detail.correction.status}`)} · {new Date(queue.detail.correction.decidedAt).toLocaleString($locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</p>{/if}
				<details><summary class="cursor-pointer font-medium">{$t('corrections.history')}</summary><ol class="mt-3 space-y-2">{#each queue.detail.correction.revisions as revision (revision.version)}<li class="border-l-2 pl-3">{new Date(revision.at).toLocaleString($locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })} · {revision.reason}<ul class="mt-2 space-y-1">{#each correctionRevisionDiff(queue.detail, revision.version, $t) as previous, index (`${previous.label}-${index}`)}<li>{previous.label}: {previous.before} → {previous.proposed}</li>{/each}</ul></li>{/each}{#each queue.detail.history as event, index (`${event.at}-${index}`)}<li class="border-l-2 pl-3">{new Date(event.at).toLocaleString($locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })} · {$t(`corrections.event.${event.action}`)}</li>{/each}</ol></details>
			{:else}<p role="status">{$t('dataState.loading')}</p>{/if}
		</div>

	</DrawerFrame>
{/if}
<FormModal open={action === 'reject' && Boolean(queue.detail?.allowedActions.reject)} title={$t('marks.reject')} {busy} submitDisabled={!rejectionReason.trim()} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('reject')}><Textarea bind:value={rejectionReason} required aria-label={$t('marks.reasonRequired')} /></FormModal>
<FormModal open={action === 'approve' && Boolean(queue.detail?.allowedActions.approve)} title={$t('marks.approve')} {busy} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('approve', true)}>{#each consequences as consequence (consequence)}<p>{$t(`corrections.consequence.${consequence}`)}</p>{/each}</FormModal>

<FormModal open={action === 'publish' && Boolean(queue.detail?.allowedActions.publish)} title={$t('marks.publish')} {busy} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('publish', true)}><p>{$t('marks.publishExplanation')}</p></FormModal>

<FormModal open={action === 'withdraw' && Boolean(queue.detail?.allowedActions.withdraw)} title={$t('marks.withdraw')} {busy} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('withdraw', true)}><p>{$t('corrections.withdrawExplanation')}</p></FormModal>
