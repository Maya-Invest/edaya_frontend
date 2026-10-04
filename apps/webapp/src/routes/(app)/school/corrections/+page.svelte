<script lang="ts">
	import { page } from '$app/stores';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { correctionDiff, correctionRevisionDiff } from './correction-diff';
	import { CorrectionsPageState } from './corrections-page.svelte';

	const queue = new CorrectionsPageState();
	let busy = $state(false);
	const documentOutcome = $derived(queue.detail?.original?.documentOutcome as { issuanceId: string; status: string; failureCode?: string } | undefined);
	let rejectionReason = $state('');
	let nextPending = $state(false);
	let search = $derived($page.url.searchParams.get('search') || '');
	const workflow = $derived($page.url.searchParams.get('workflow') || '');
	const status = $derived($page.url.searchParams.get('status') || 'pending');
	const action = $derived($page.url.searchParams.get('action') || '');
	const workflows = $derived(['', 'grades', 'attendance', 'report_comments', 'logbook', 'discipline'].map(value => ({ value, label: $t(`corrections.workflow.${value || 'all'}`) })));
	const statuses = $derived(['pending', 'approved', 'rejected', 'withdrawn'].map(value => ({ value, label: $t(`marks.${value}`) })));
	const diffs = $derived(queue.detail ? correctionDiff(queue.detail, $t) : []);
	const consequences = $derived(queue.detail?.correction.workflow === 'grades' ? [] : queue.detail?.correction.consequences ?? []);
	function navigate(key: string, value: string, reset = true) {
		const url = new URL($page.url);
		if (value)
			url.searchParams.set(key, value);
		else url.searchParams.delete(key);
		if (key === 'correction' && !value)
			url.searchParams.delete('action');
		if (reset) {
			url.searchParams.delete('offset');
			url.searchParams.delete('correction');
			url.searchParams.delete('action');
		}
		void appGoto(url.pathname + url.search, { keepFocus: true, noScroll: true });
	}
	async function decide(decision: 'approve' | 'reject', confirmed = false) {
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

<ListPageHeader title={$t('corrections.title')}>
	{#snippet filters()}
		<label class="flex items-center gap-2 text-sm">{$t('corrections.workflowLabel')}<FilterSelect value={workflow} options={workflows} onchange={value => navigate('workflow', value)} /></label>
		<label class="flex items-center gap-2 text-sm">{$t('corrections.statusLabel')}<FilterSelect value={status} options={statuses} onchange={value => navigate('status', value)} /></label>
		{#if workflow === 'grades' || workflow === 'report_comments'}<AcademicPeriodSelector />{/if}
	{/snippet}
</ListPageHeader>
<form class="mb-4 flex gap-2" onsubmit={(event) => {
	event.preventDefault();
	navigate('search', search.trim());
}}>
	<Input type="search" bind:value={search} aria-label={$t('common.search')} placeholder={$t('corrections.search')} /><Button type="submit">{$t('common.search')}</Button>
</form>
<FilterPanel>
	<label>{$t('corrections.class')}<FilterSelect value={$page.url.searchParams.get('classGroupId') || ''} options={[{ value: '', label: $t('common.all') }, ...queue.filters.classes]} onchange={value => navigate('classGroupId', value)} /></label>
	<label>{$t('corrections.teacher')}<FilterSelect value={$page.url.searchParams.get('teacherSubjectId') || ''} options={[{ value: '', label: $t('common.all') }, ...queue.filters.teachers]} onchange={value => navigate('teacherSubjectId', value)} /></label>
	<label>{$t('corrections.student')}<FilterSelect value={$page.url.searchParams.get('studentId') || ''} options={[{ value: '', label: $t('common.all') }, ...queue.filters.students]} onchange={value => navigate('studentId', value)} /></label>
	<label>{$t('corrections.from')}<Input type="date" value={$page.url.searchParams.get('from') || ''} onchange={event => navigate('from', event.currentTarget.value)} /></label>
	<label>{$t('corrections.to')}<Input type="date" value={$page.url.searchParams.get('to') || ''} onchange={event => navigate('to', event.currentTarget.value)} /></label>
</FilterPanel>
<PageQuery query={queue.query} cacheKey={url => url.pathname + url.search} cache={false} preserveWhileLoading loadingTitle={$t('corrections.title')}>
	{#snippet children(data)}
		<DataState status={queue.listLoading ? 'ready' : data.status} errorMessage={data.errorMessage}>
			<InfiniteList hasMore={queue.hasMore} loading={queue.listLoading || queue.loadingMore} total={queue.total} visibleCount={queue.items.length} onLoadMore={() => void queue.loadMore()}>
				<div class="space-y-3">
					{#if queue.listLoading}<p class="py-4 text-center text-sm text-muted-foreground" role="status">{$t('dataState.loading')}</p>{/if}
					{#each queue.items as item (item.id)}
						<button type="button" class="control-focus block w-full rounded-xl border bg-card p-4 text-left hover:bg-secondary" onclick={() => navigate('correction', item.id, false)}>
							<div class="flex flex-wrap items-center justify-between gap-2"><strong>{item.title || item.className}</strong><span class="rounded-full bg-secondary px-3 py-1 text-xs">{$t(`corrections.workflow.${item.workflow}`)}</span></div>
							<p class="mt-1 text-sm text-muted-foreground">{item.teacherName || $t('corrections.teacher')} · {item.className} · {new Date(item.createdAt).toLocaleString()}</p>
							<p class="mt-1 text-sm">{item.students.map(student => student.name).join(', ')}</p><p class="mt-2 whitespace-pre-wrap">{item.reason}</p>
						</button>
					{/each}
				</div>
			</InfiniteList>
			{#if queue.loadMoreError}<Button variant="outline" onclick={() => {
				queue.loadMoreError = false;
				void queue.loadMore();
			}}>{$t('common.retry')}</Button>{/if}
		</DataState>
	{/snippet}
</PageQuery>
<Dialog.Root open={!!queue.detail && !!$page.url.searchParams.get('correction')} onOpenChange={(open) => {
	if (!open && !busy)
		navigate('correction', '', false);
}}>
	<Dialog.Content class="left-auto right-0 top-0 min-w-0 content-start break-words h-dvh max-h-dvh w-full max-w-2xl translate-x-0 translate-y-0 rounded-none">
		{#if queue.detail}
			<Dialog.Header><Dialog.Title>{$t('corrections.title')} · {$t(`corrections.workflow.${queue.detail.correction.workflow}`)}</Dialog.Title><Dialog.Description>{queue.detail.context.teacherName || $t('corrections.teacher')} · {queue.detail.context.className} · {queue.detail.context.students.map(student => student.name).join(', ')}</Dialog.Description></Dialog.Header>
			<Button variant="ghost" onclick={() => navigate('correction', '', false)} disabled={busy}>{$t('common.close')}</Button>
			<p class="whitespace-pre-wrap rounded-lg bg-secondary p-3">{queue.detail.correction.reason}</p>
			<div class="space-y-4">{#each diffs as diff, index (`${diff.label}-${index}`)}<section><h3 class="mb-2 text-sm font-semibold">{diff.label}</h3><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><div class="rounded-lg border p-3"><p class="mb-1 text-xs text-muted-foreground">{$t('corrections.official')}</p><p class="whitespace-pre-wrap">{diff.before}</p></div><div class="rounded-lg border border-primary/30 bg-primary/5 p-3"><p class="mb-1 text-xs text-primary">{$t('corrections.proposed')}</p><p class="whitespace-pre-wrap">{diff.proposed}</p></div></div></section>{/each}</div>
			{#each consequences as consequence (consequence)}<p class="rounded-lg border bg-secondary p-3 text-sm">{$t(`corrections.consequence.${consequence}`)}</p>{/each}
			{#if documentOutcome}<p class="rounded-lg border p-3" role="status">{$t(`corrections.document.${documentOutcome.status}`)}</p>{#if documentOutcome.status === 'failed'}<Button disabled={busy} onclick={async () => {
				busy = true;
				try {
					if (await queue.retryDocument(documentOutcome!.issuanceId))
						navigate('refresh', String(Date.now()), false);
				}
				finally {
					busy = false;
				}
			}}>{$t('common.retry')}</Button>{/if}{/if}
			{#if queue.detail.correction.rejectionReason}<p>{$t('corrections.rejectionReason')}: {queue.detail.correction.rejectionReason}</p>{/if}
			{#if queue.detail.correction.decidedAt}<p class="text-sm">{$t(`marks.${queue.detail.correction.status}`)} · {new Date(queue.detail.correction.decidedAt).toLocaleString()}</p>{/if}
			<details><summary class="cursor-pointer font-medium">{$t('corrections.history')}</summary><ol class="mt-3 space-y-2">{#each queue.detail.correction.revisions as revision (revision.version)}<li class="border-l-2 pl-3">{new Date(revision.at).toLocaleString()} · {revision.reason}<ul class="mt-2 space-y-1">{#each correctionRevisionDiff(queue.detail, revision.version, $t) as previous, index (`${previous.label}-${index}`)}<li>{previous.label}: {previous.before} → {previous.proposed}</li>{/each}</ul></li>{/each}{#each queue.detail.history as event, index (`${event.at}-${index}`)}<li class="border-l-2 pl-3">{new Date(event.at).toLocaleString()} · {$t(`corrections.event.${event.action}`)}</li>{/each}</ol></details>
			{#if queue.detail.allowedActions.approve || queue.detail.allowedActions.reject}<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={nextPending} />{$t('corrections.nextPending')}</label><div class="flex flex-wrap gap-2"><Button disabled={busy || !queue.detail.allowedActions.approve} onclick={() => decide('approve')}>{$t('marks.approve')}</Button><Button variant="outline" disabled={busy || !queue.detail.allowedActions.reject} onclick={() => navigate('action', 'reject', false)}>{$t('marks.reject')}</Button></div>{/if}
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
