<script lang="ts">
	import type { InboxDelivery } from '$lib/api/notifications-inbox-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { getInboxPageState } from '../inbox-page.svelte';

	const {
		onSelect,
		onClose,
	}: {
		onSelect: (delivery: InboxDelivery) => void;
		onClose: () => void;
	} = $props();

	const inboxPage = getInboxPageState();
	const deliveries = $derived(inboxPage.deliveries);
	const selectedId = $derived(inboxPage.selectedId);
	const selected = $derived(inboxPage.selected);

	let markingRead = $state(false);

	function fmtDate(value: string | undefined) {
		if (!value) {
			return '—';
		}
		return new Date(value).toLocaleDateString(undefined, {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function statusLabel(status: InboxDelivery['status']) {
		return $t(`account.inbox.status.${status}`);
	}

	$effect(() => {
		const delivery = selected;
		if (!delivery || delivery.status === 'read' || markingRead) {
			return;
		}
		markingRead = true;
		void inboxPage.markDeliveryRead(delivery.id).finally(() => {
			markingRead = false;
		});
	});
</script>

<div class="flex h-full flex-col overflow-hidden">
	<ListPageHeader title={$t('account.inbox.title')} />

	<div class="relative flex min-h-0 flex-1">
		<div class="min-w-0 flex-1 overflow-y-auto p-4">
			{#if deliveries.length === 0}
				<p class="px-2 text-sm text-muted-foreground">{$t('account.inbox.empty')}</p>
			{:else}
				<ul class="space-y-2">
					{#each deliveries as delivery (delivery.id)}
						<li>
							<button
								type="button"
								class={cn(
									'w-full rounded-collection border px-4 py-3 text-left transition',
									selectedId === delivery.id
										? 'border-primary bg-primary/5'
										: 'border-border bg-card hover:bg-secondary/40',
									delivery.status !== 'read' && 'font-medium',
								)}
								onclick={() => onSelect(delivery)}
							>
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<p class="truncate text-sm">{delivery.title}</p>
										<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
											{delivery.body}
										</p>
									</div>
									<span class="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
										{statusLabel(delivery.status)}
									</span>
								</div>
								<p class="mt-2 text-[11px] text-muted-foreground">
									{fmtDate(delivery.sentAt ?? delivery.createdAt)}
								</p>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if selected}
			<aside class="absolute inset-y-0 right-0 z-20 flex w-full max-w-xl flex-col border-l border-border bg-card shadow-xl">
				<div class="flex items-center justify-between border-b border-border px-5 py-4">
					<h2 class="font-display text-lg font-semibold">{$t('account.inbox.detail')}</h2>
					<Button variant="ghost" size="icon" onclick={onClose} aria-label={$t('common.close')}>
						<X class="h-4 w-4" />
					</Button>
				</div>
				<div class="flex-1 space-y-4 overflow-y-auto p-5">
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('account.inbox.statusLabel')}
						</p>
						<p class="mt-1 text-sm">{statusLabel(selected.status)}</p>
					</div>
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('account.inbox.receivedAt')}
						</p>
						<p class="mt-1 text-sm">{fmtDate(selected.sentAt ?? selected.createdAt)}</p>
					</div>
					<div>
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('account.inbox.message')}
						</p>
						<h3 class="mt-2 font-display text-xl font-semibold">{selected.title}</h3>
						<p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
							{selected.body}
						</p>
					</div>
				</div>
			</aside>
		{/if}
	</div>
</div>
