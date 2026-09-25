<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { MarksReviewPageState } from './marks-review-page.svelte';

	const queue = new MarksReviewPageState();
</script>
<ListPageHeader title={$t('marks.reviewQueue')} />
<PageQuery query={queue.query} cache={false} loadingTitle={$t('marks.reviewQueue')}>
	{#snippet children(data)}
		<DataState status={data.status} errorMessage={data.errorMessage}>
			<div class="space-y-3">
				{#each queue.items as item (item.correction.id)}
					<a class="block rounded-xl border bg-card p-4" href={`/classes/${item.assessment.classGroupId}/evaluations/${item.assessment.id}/grading`}>
						<strong>{item.assessment.title}</strong><p>{$t(`marks.${item.correction.status}`)} · {item.correction.changes.length} · {item.correction.reason}</p>
					</a>
				{/each}
			</div>
		</DataState>
		<div class="mt-4 flex gap-3">
			<Button onclick={() => goto(resolve(`/school/marks-review?offset=${Math.max(0, queue.offset - queue.limit)}`))} disabled={queue.offset === 0}>{$t('common.back')}</Button>
			<span>{queue.offset + 1}–{Math.min(queue.total, queue.offset + queue.limit)} / {queue.total}</span>
			<Button onclick={() => goto(resolve(`/school/marks-review?offset=${queue.offset + queue.limit}`))} disabled={queue.offset + queue.limit >= queue.total}>{$t('common.next')}</Button>
		</div>
	{/snippet}
</PageQuery>
