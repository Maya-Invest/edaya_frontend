<script lang="ts">
	import { provideCollectionPresentation } from '$lib/list/collection-presentation.svelte';

	provideCollectionPresentation();
	import { page } from '$app/stores';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t, locale } from '$lib/i18n';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
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
	let nextPending = $state(false);
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
		{ key: 'request', label: $t('corrections.request'), span: 5 },
		{ key: 'context', label: $t('corrections.context'), span: 3 },
		{ key: 'workflow', label: $t('corrections.workflowLabel'), span: 2 },
		{ key: 'status', label: $t('common.status'), span: 2 },
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
		void appGoto(url.pathname + url.search, { keepFocus: true, noScroll: true });
	}
	async function decide(decision: 'approve' | 'reject' | 'publish', confirmed = false) {
		const detail = queue.detail;
		if (!detail || busy)
			return;
		if (decision === 'approve' && consequences.some(value => value !== 'review_discipline_outcomes') && !confirmed) {
			navigate('action', 'approve', false);
			return;
		}
		busy = true;
		try {
			if (!await queue.decide(decision, rejectionReason, confirmed, $t))
				return;
			const next = nextPending ? queue.items.find(item => item.id !== detail.correction.id && item.status === 'pending')?.id : undefined;
			rejectionReason = '';
			const url = new URL($page.url);
			url.searchParams.delete('action');
			url.searchParams.delete('correction');
			if (next)
				url.searchParams.set('correction', next);
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
		}} eyebrow={$t('corrections.title')} title={$t(queue.total === 1 ? 'corrections.countOne' : 'corrections.count', { n: queue.total })}>
		{#snippet search()}
			<ListSearchField value={searchFilter.values.search} oninput={event => searchFilter.patch({ search: event.currentTarget.value })} placeholder={$t('corrections.search')} class="w-full sm:w-64" />
		{/snippet}
		{#snippet filters()}
			<FilterSelect class="h-9 w-52 rounded-full" aria-label={$t('corrections.workflowLabel')} value={workflow} options={workflows} onchange={value => navigate('workflow', value)} />
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
				<ListEntityTable listKey="CorrectionsView" {columns} rows={queue.items} highlightId={$page.url.searchParams.get('correction') ?? undefined} hasMore={queue.hasMore} loading={queue.listLoading} loadingMore={queue.loadingMore} total={queue.total} visibleCount={queue.items.length} onLoadMore={() => void queue.loadMore()} onRowClick={item => navigate('correction', item.id, false)} emptyLabel={$t('dataState.emptyTitle')}>
					{#snippet cell(item, column, _ctx)}

						{#if column.key === 'request'}
							<div class="col-span-5 min-w-0"><p class="break-words text-sm font-medium">{item.title || item.className}</p><p class="mt-1 break-words whitespace-pre-wrap text-sm text-muted-foreground">{item.reason}</p>{#if item.students.length}<p class="mt-2 break-words text-sm">{item.students.map(student => student.name).join(', ')}</p>{/if}</div>
						{:else if column.key === 'context'}
							<div class="col-span-3 min-w-0 text-sm"><p class="break-words font-medium">{item.teacherName || $t('corrections.teacher')}</p><p class="mt-1 break-words text-muted-foreground">{item.className}</p><p class="mt-1 text-xs text-muted-foreground tabular-nums">{new Date(item.createdAt).toLocaleString($locale, { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
						{:else if column.key === 'workflow'}
							<div class="col-span-2"><span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_INFO}`}>{$t(`corrections.workflow.${item.workflow}`)}</span></div>
						{:else if column.key === 'status'}
							<div class="col-span-2"><span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[item.status] ?? BADGE}`}>{$t(`marks.${item.status}`)}</span></div>
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
<Dialog.Root open={!!queue.detail && !!$page.url.searchParams.get('correction')} onOpenChange={(open) => {
	if (!open && !busy)
		navigate('correction', '', false);
}}>
	<Dialog.Content class="fixed inset-y-0 left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 lg:w-1/2">
		{#if queue.detail}
			<div class="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4"><Dialog.Title class="text-sm font-medium">{$t('corrections.title')}</Dialog.Title><Button variant="ghost" onclick={() => navigate('correction', '', false)} disabled={busy}>{$t('common.close')}</Button></div>
			<div class="min-h-0 flex-1 space-y-5 overflow-y-auto break-words p-5">
				<DrawerEntityHeader name={$t(`corrections.workflow.${queue.detail.correction.workflow}`)} summary={`${queue.detail.context.teacherName || $t('corrections.teacher')} · ${queue.detail.context.className}`}>
					{#snippet chips()}{#if queue.detail}<span class={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[queue.detail.correction.status] ?? BADGE}`}>{$t(`marks.${queue.detail.correction.status}`)}</span>{/if}{/snippet}
				</DrawerEntityHeader>
				<Dialog.Description>{queue.detail.context.students.map(student => student.name).join(', ') || queue.detail.context.className}</Dialog.Description>
				<p class="whitespace-pre-wrap rounded-collection bg-secondary p-3">{queue.detail.correction.reason}</p>
				<div class="space-y-4">{#each diffs as diff, index (`${diff.label}-${index}`)}<section><h3 class="mb-2 text-sm font-semibold">{diff.label}</h3><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><div class="rounded-collection border p-3"><p class="mb-1 text-xs text-muted-foreground">{$t('corrections.official')}</p><p class="whitespace-pre-wrap">{diff.before}</p></div><div class="rounded-collection border border-primary/30 bg-primary/5 p-3"><p class="mb-1 text-xs text-primary">{$t('corrections.proposed')}</p><p class="whitespace-pre-wrap">{diff.proposed}</p></div></div></section>{/each}</div>
				{#each consequences as consequence (consequence)}<p class="rounded-collection border bg-secondary p-3 text-sm">{$t(`corrections.consequence.${consequence}`)}</p>{/each}
				{#if documentOutcome}<p class="rounded-collection border p-3" role="status">{$t(`corrections.document.${documentOutcome.status}`)}</p>{#if documentOutcome.status === 'failed'}<Button disabled={busy} onclick={async () => {
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
				{#if queue.detail.correction.decidedAt}<p class="text-sm">{$t(`marks.${queue.detail.correction.status}`)} · {new Date(queue.detail.correction.decidedAt).toLocaleString()}</p>{/if}
				<details><summary class="cursor-pointer font-medium">{$t('corrections.history')}</summary><ol class="mt-3 space-y-2">{#each queue.detail.correction.revisions as revision (revision.version)}<li class="border-l-2 pl-3">{new Date(revision.at).toLocaleString()} · {revision.reason}<ul class="mt-2 space-y-1">{#each correctionRevisionDiff(queue.detail, revision.version, $t) as previous, index (`${previous.label}-${index}`)}<li>{previous.label}: {previous.before} → {previous.proposed}</li>{/each}</ul></li>{/each}{#each queue.detail.history as event, index (`${event.at}-${index}`)}<li class="border-l-2 pl-3">{new Date(event.at).toLocaleString()} · {$t(`corrections.event.${event.action}`)}</li>{/each}</ol></details>
				{#if queue.detail.allowedActions.publish}<Button disabled={busy} onclick={() => navigate('action', 'publish', false)}>{$t('marks.publish')}</Button>{/if}
				{#if queue.detail.allowedActions.approve || queue.detail.allowedActions.reject}<label class="flex items-center gap-2 text-sm"><Checkbox checked={nextPending} onCheckedChange={value => nextPending = value === true} />{$t('corrections.nextPending')}</label><div class="flex flex-wrap gap-2"><Button disabled={busy || !queue.detail.allowedActions.approve} onclick={() => decide('approve')}>{$t('marks.approve')}</Button><Button variant="outline" disabled={busy || !queue.detail.allowedActions.reject} onclick={() => navigate('action', 'reject', false)}>{$t('marks.reject')}</Button></div>{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
<FormModal open={action === 'reject'} title={$t('marks.reject')} {busy} submitDisabled={!rejectionReason.trim()} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('reject')}><Textarea bind:value={rejectionReason} required aria-label={$t('marks.reasonRequired')} /></FormModal>
<FormModal open={action === 'approve'} title={$t('marks.approve')} {busy} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('approve', true)}>{#each consequences as consequence (consequence)}<p>{$t(`corrections.consequence.${consequence}`)}</p>{/each}</FormModal>

<FormModal open={action === 'publish'} title={$t('marks.publish')} {busy} onOpenChange={(open) => {
	if (!open)
		navigate('action', '', false);
}} onSubmit={() => decide('publish', true)}><p>{$t('marks.publishExplanation')}</p></FormModal>
