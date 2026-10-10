<script lang="ts">
	import type { MessagesPageState } from '../messages-page.svelte';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import ConversationMessageBubble from './ConversationMessageBubble.svelte';

	const { state, navigate }: { state: MessagesPageState; navigate: (id?: string, changes?: Record<string, string>) => void } = $props();
	const detail = $derived(state.detail);
	const replyOpen = $derived($page.url.searchParams.get('modal') === 'reply' && Boolean(detail));
	function closeReply() {
		navigate(state.selectedId, { modal: '' });
	}
</script>
<ListPageHeader title={$t('messages.title')}>
	{#snippet filters()}
		<div class="flex flex-wrap items-center gap-2">
			{#if hasPermission('SCHOOL_MESSAGES_READ')}<Button variant={state.destination === 'school' ? 'default' : 'outline'} onclick={() => navigate(undefined, { view: '', offset: '', modal: '' })}>{$t('messages.school')}</Button>{/if}
			{#if hasPermission('TEACHER_MESSAGES_REVIEW')}<Button variant={state.destination === 'teacher' ? 'default' : 'outline'} onclick={() => navigate(undefined, { view: 'teacher', status: '', offset: '', modal: '' })}>{$t('messages.review')}</Button>{/if}
			{#if state.destination === 'school'}
				<label class="sr-only" for="message-status">{$t('messages.all')}</label>
				<select id="message-status" class="h-10 rounded-md border border-input bg-background px-3 text-sm" value={$page.url.searchParams.get('status') ?? ''} onchange={event => navigate(undefined, { status: event.currentTarget.value, offset: '' })}>
					<option value="">{$t('messages.all')}</option><option value="awaiting_school">{$t('messages.awaiting_school')}</option><option value="awaiting_guardian">{$t('messages.awaiting_guardian')}</option><option value="resolved">{$t('messages.resolved')}</option>
				</select>
				<label class="sr-only" for="message-order">{$t('messages.latest')}</label>
				<select id="message-order" class="h-10 rounded-md border border-input bg-background px-3 text-sm" value={$page.url.searchParams.get('order') ?? 'latest'} onchange={event => navigate(undefined, { order: event.currentTarget.value, offset: '' })}>
					<option value="latest">{$t('messages.latest')}</option><option value="oldest_awaiting">{$t('messages.oldest')}</option>
				</select>
			{/if}
			<Button variant="outline" disabled={state.busy} onclick={() => state.refresh()}>{$t('messages.refresh')}</Button>
		</div>
	{/snippet}
</ListPageHeader>
{#if state.error}<p role="alert" class="p-4 text-destructive">{state.error}</p>{/if}
<div class="space-y-2 p-4">
	{#if !state.items.length}<p>{$t('messages.empty')}</p>{/if}
	{#each state.items as row (row.id)}
		<button class="w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-muted" onclick={() => navigate(row.id)}>
			<div class="flex flex-wrap justify-between gap-2"><strong>{row.subject}</strong>{#if row.unread}<span>{$t('messages.unread')}</span>{/if}</div>
			<p class="text-sm text-muted-foreground">{row.guardianName} · {row.studentName ?? row.schoolName}{row.teacherName ? ` · ${row.teacherName}` : ''}</p>
			<p class="mt-2 line-clamp-2 text-sm">{row.lastMessage}</p>
			{#if row.destination === 'school'}<p class="mt-2 text-sm">{$t(`messages.${row.status}`)}</p>{/if}
		</button>
	{/each}
	<div class="flex items-center gap-3">
		<Button variant="outline" disabled={state.offset === 0} onclick={() => navigate(undefined, { offset: String(Math.max(0, state.offset - 25)) })}>{$t('common.back')}</Button>
		<span>{state.total ? state.offset + 1 : 0}–{Math.min(state.total, state.offset + 25)} / {state.total}</span>
		<Button variant="outline" disabled={state.offset + 25 >= state.total} onclick={() => navigate(undefined, { offset: String(state.offset + 25) })}>{$t('common.next')}</Button>
	</div>
</div>
<Dialog.Root open={Boolean(detail)} onOpenChange={(open) => {
	if (!open)
		navigate(undefined, { modal: '' });
}}>
	<Dialog.Content class="fixed inset-y-0 right-0 left-auto top-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none p-0 md:w-1/2">
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
