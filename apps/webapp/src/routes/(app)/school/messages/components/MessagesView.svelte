<script lang="ts">
	import type { MessagesPageState } from '../messages-page.svelte';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t, locale } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { BADGE_INFO, BADGE_SUCCESS, BADGE_WARN } from '$lib/ui-tones';
	import ConversationMessageBubble from './ConversationMessageBubble.svelte';

	const { state, navigate }: {
		state: MessagesPageState;
		navigate: (id?: string, changes?: Record<string, string>) => void;
	} = $props();
	const columns = $derived([
		{ key: 'subject', label: $t('messages.subject'), span: 4 },
		{ key: 'participants', label: $t('messages.participants'), span: 4 },
		{ key: 'status', label: $t('common.status'), span: 2 },
		{ key: 'activity', label: $t('messages.latest'), span: 2 },
	]);
	const destinations = $derived([
		{ value: 'all', label: $t('messages.allConversations') },
		...(hasPermission('SCHOOL_MESSAGES_READ') ? [{ value: 'school', label: $t('messages.type.school') }] : []),
		...(hasPermission('TEACHER_MESSAGES_REVIEW') ? [{ value: 'teacher', label: $t('messages.type.teacher') }] : []),
	]);
	const status = $derived($page.url.searchParams.get('status') ?? '');
	const order = $derived($page.url.searchParams.get('order') ?? 'latest');
	const activeFilters = $derived(Number(Boolean(status)) + Number(order !== 'latest'));
	const detail = $derived(state.detail);
	const replyOpen = $derived($page.url.searchParams.get('modal') === 'reply' && Boolean(detail));
	function closeReply() {
		navigate(state.selectedId, { modal: '' });
	}
</script>
<div class="animate-fade-in">
	<ListPageHeader
		filterCount={activeFilters + Number(state.destination !== 'all')}
		onResetFilters={() => navigate(undefined, { type: '', status: '', order: '', modal: '' })} eyebrow={$t('messages.title')} title={$t(state.total === 1 ? 'messages.countOne' : 'messages.count', { n: state.total })}>
		{#snippet filters()}
			<FilterSelect class="h-9 w-56 rounded-full" aria-label={$t('messages.typeLabel')} value={state.destination} options={destinations} onchange={value => navigate(undefined, { type: value === 'all' ? '' : value, modal: '' })} />
			<FilterPanel activeCount={activeFilters} class="border-input bg-background">
				<div class="space-y-2">
					<Label for="message-status">{$t('common.status')}</Label>
					<FilterSelect id="message-status" aria-label={$t('common.status')} class="h-9 w-full" value={status} options={['', 'awaiting_school', 'awaiting_guardian', 'resolved'].map(value => ({ value, label: $t(value ? `messages.${value}` : 'messages.all') }))} onchange={value => navigate(undefined, { status: value })} />
				</div>
				<div class="space-y-2">
					<Label for="message-order">{$t('messages.sort')}</Label>
					<FilterSelect id="message-order" aria-label={$t('messages.sort')} class="h-9 w-full" value={order} options={[{ value: 'latest', label: $t('messages.latest') }, { value: 'oldest_awaiting', label: $t('messages.oldest') }]} onchange={value => navigate(undefined, { order: value })} />
				</div>
			</FilterPanel>
		{/snippet}
		{#snippet more()}
			<Button variant="outline" size="sm" class="rounded-full" disabled={state.busy || state.loadingMore} onclick={() => state.refresh()}>{$t('messages.refresh')}</Button>
		{/snippet}
	</ListPageHeader>
	{#if state.error}<p role="alert" class="mb-4 text-sm text-destructive">{state.error}</p>{/if}
	<ListEntityTable listKey="MessagesView" {columns} rows={state.items} highlightId={state.selectedId} hasMore={state.hasMore} loading={state.busy} loadingMore={state.loadingMore} total={state.total} visibleCount={state.items.length} onLoadMore={() => void state.loadMore()} onRowClick={row => navigate(row.id)} emptyLabel={$t('messages.empty')}>
		{#snippet cell(item, column, _ctx)}

			{#if column.key === 'subject'}
				<div class="col-span-4 min-w-0">
					<div class="flex flex-wrap items-center gap-2"><span class="break-words text-sm font-medium">{item.subject}</span><span class={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_INFO}`}>{$t(`messages.type.${item.destination}`)}</span>{#if item.unread}<span class={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_INFO}`}>{$t('messages.unread')}</span>{/if}</div>
					<p class="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">{item.lastMessage}</p>
				</div>
			{:else if column.key === 'participants'}
				<div class="col-span-4 min-w-0 text-sm"><p class="break-words font-medium">{item.guardianName}</p><p class="mt-1 break-words text-muted-foreground">{item.studentName ?? item.schoolName}{item.teacherName ? ` · ${item.teacherName}` : ''}</p></div>
			{:else if column.key === 'status'}
				<div class="col-span-2"><span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.destination === 'teacher' ? BADGE_INFO : item.status === 'resolved' ? BADGE_SUCCESS : BADGE_WARN}`}>{$t(item.destination === 'teacher' ? 'messages.reviewOnly' : `messages.${item.status}`)}</span></div>
			{:else if column.key === 'activity'}
				<div class="col-span-2 text-sm text-muted-foreground tabular-nums">{new Date(item.updatedAt).toLocaleString($locale, { dateStyle: 'medium', timeStyle: 'short' })}</div>
			{/if}
		{/snippet}
	</ListEntityTable>
	{#if state.loadMoreError}
		<div class="mt-4 flex flex-wrap items-center gap-3"><p role="alert" class="text-sm text-destructive">{$t('messages.failed')}</p><Button variant="outline" disabled={state.busy || state.loadingMore} onclick={() => state.retryLoadMore()}>{$t('dataState.retry')}</Button></div>
	{/if}
</div>
<Dialog.Root open={Boolean(detail)} onOpenChange={(open) => {
	if (!open)
		navigate(undefined, { modal: '' });
}}>
	<Dialog.Content class="fixed inset-y-0 right-0 left-auto top-0 flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 lg:w-1/2">
		{#if detail}
			<div class="flex h-full flex-col">
				<div class="flex items-center justify-between border-b border-border p-4"><Dialog.Title>{$t('messages.title')}</Dialog.Title><Button variant="ghost" aria-label={$t('common.close')} onclick={() => navigate(undefined, { modal: '' })}>{$t('common.close')}</Button></div>
				<div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
					<div class="conversation-heading">
						<DrawerEntityHeader name={detail.conversation.subject} summary={`${detail.conversation.schoolName} · ${detail.conversation.guardianName}${detail.conversation.studentName ? ` · ${detail.conversation.studentName}` : ''}`}>
							{#snippet actions()}
								{#if detail.conversation.allowedActions.reply}<Button class="h-auto min-h-10 whitespace-normal" onclick={() => {
									state.beginReply();
									navigate(state.selectedId, { modal: 'reply' });
								}}>{$t('messages.reply')}</Button>{/if}
								{#if detail.conversation.allowedActions.resolve}<Button class="h-auto min-h-10 whitespace-normal" variant="outline" disabled={state.sending || detail.conversation.status === 'resolved'} onclick={() => state.mutate('resolve')}>{$t('messages.resolve')}</Button>{/if}
							{/snippet}
						</DrawerEntityHeader>
					</div>
					<Dialog.Description>{detail.conversation.destination === 'teacher' ? `${detail.conversation.teacherName} · ${$t('messages.reviewOnly')}` : $t(`messages.${detail.conversation.status}`)}</Dialog.Description>
					{#if !detail.conversation.allowedActions.reply && detail.conversation.destination === 'school'}<p>{$t('messages.unavailable')}</p>{/if}
					{#if detail.hasMore}<Button variant="outline" onclick={() => state.older()}>{$t('messages.more')}</Button>{/if}
					<div class="conversation-thread space-y-3">
						{#each detail.messages as message (message.id)}
							<ConversationMessageBubble {message} destination={detail.conversation.destination} />
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
<FormModal open={replyOpen} title={$t('messages.reply')} submitLabel={$t('messages.send')} busy={state.sending} submitDisabled={state.needsReview || !state.draft.trim() || !detail?.conversation.allowedActions.reply} onCancel={closeReply} onOpenChange={(open) => {
	if (!open)
		closeReply();
}} onSubmit={async () => {
	if (await state.mutate('reply'))
		closeReply();
}}>
	<Label for="school-message-body">{$t('messages.body')}</Label>
	<Textarea id="school-message-body" bind:value={state.draft} maxlength={10000} rows={6} disabled={state.sending} />
	{#if state.error}<p role="alert">{state.error}</p>{/if}
	{#if state.needsReview}<Button variant="outline" onclick={closeReply}>{$t('messages.reviewActivity')}</Button>{/if}
</FormModal>

<style>
	.conversation-thread { container-type: inline-size; }
	.conversation-heading :global(header > div > div:first-child) { flex-basis: 16rem; }
	.conversation-heading :global(header > div > div:last-child) { max-width: 100%; }
</style>
