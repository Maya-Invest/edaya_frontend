<script lang="ts">
	import type { StudentBilling } from '$lib/types/school';
	import { financeReadKey } from '$lib/api/finance-workspace';
	import DocumentPdfButton from '$lib/components/school/documents/DocumentPdfButton.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { billingHistory } from '$lib/finance/billing-history';
	import { formatMinorUnits } from '$lib/finance/money';
	import { locale, t } from '$lib/i18n';
	import { getBillingPageState } from '../../billing-page.svelte';

	const { billing, tab }: { billing: StudentBilling; tab: string } = $props();
	const state = getBillingPageState();
	const query = state.queryHistory(() => billing.accountId ?? state.accountForStudent(billing.studentId)?.id ?? '');
</script>
<PageQuery {query} cacheKey={() => financeReadKey(`history:${billing.id}`)}>
	{#snippet children(data)}
		<DataState status={data.status} errorMessage={data.errorMessage}>
			{#if tab === 'payments'}
				{@const allocations = data.history?.allocations.filter(row => row.chargeId === billing.id && row.kind === 'settle') ?? []}
				{@const reversed = new Set(data.history?.allocations.filter(row => row.kind === 'reverse').map(row => row.reversesAllocationId))}
				<p class="text-sm font-medium">{$t('finance.applied')}: {formatMinorUnits(allocations.filter(row => !reversed.has(row.id)).reduce((sum, row) => sum + row.amount, 0), billing.currency, $locale)}</p>
				<div class="mt-4 space-y-3">
					{#each allocations as allocation (allocation.id)}
						{@const payment = data.history?.payments.find(row => row.id === allocation.causedByPaymentId)}
						<article class="space-y-2 rounded-collection border border-border p-4">
							<div class="flex flex-wrap justify-between gap-2"><strong>{formatMinorUnits(allocation.amount, billing.currency, $locale)}</strong><span class="rounded-full bg-secondary px-2 py-1 text-xs">{$t(reversed.has(allocation.id) ? 'finance.reversed' : 'finance.active')}</span></div>
							<p class="text-sm">{payment ? `${$t(`payment.method.${payment.method}`)} · ${payment.reference ?? '—'}` : $t('finance.accountCredit')}</p>
							<p class="text-xs text-muted-foreground">{new Date(allocation.recordedAt).toLocaleString($locale)}</p>
							{#if payment?.kind === 'receipt' && payment.status === 'recorded'}
								<DocumentPdfButton onRequestDocumentIssuance={state.performRequestDocumentIssuance} templateKey="receipt.v1" sourceId={payment.id} studentId={billing.studentId} permission="PAYMENT_READ" />
							{/if}
						</article>
					{:else}<p class="text-sm text-muted-foreground">{$t('finance.noAllocations')}</p>{/each}
				</div>
			{:else}
				<ol class="space-y-3">
					{#each billingHistory(billing, data.history) as event (event.id)}
						<li class="rounded-collection border border-border p-4">
							<div class="flex flex-wrap justify-between gap-2"><strong class="text-sm">{$t(`finance.event.${event.kind}`)}</strong>{#if event.amount !== undefined}<span class="text-sm tabular-nums">{formatMinorUnits(event.amount, billing.currency, $locale)}</span>{/if}</div>
							<p class="mt-1 text-xs text-muted-foreground">{new Date(event.at).toLocaleString($locale)} · {event.actor ?? $t('finance.notRecorded')}</p>
							{#if event.reason}<p class="mt-2 whitespace-pre-wrap text-sm">{event.reason}</p>{/if}
						</li>
					{:else}<li class="text-sm text-muted-foreground">{$t('finance.noHistory')}</li>{/each}
				</ol>
			{/if}
		</DataState>
	{/snippet}
</PageQuery>
