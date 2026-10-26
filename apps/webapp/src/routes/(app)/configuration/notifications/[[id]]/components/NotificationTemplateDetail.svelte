<script lang="ts">
	import type { NotificationSendChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import {
		enabledChannelsForTemplateKey,
		listChannelsForTemplateKey,
		isInvitationTemplateKey,
		NOTIFICATION_TEMPLATE_SAMPLE_VALUES,
		NOTIFICATION_TEMPLATE_VARIABLES,
		readEventTemplateEntry,
		readInvitationTemplateEntry,
	} from '$lib/notification-templates/catalog';
	import { renderTemplatePreview } from '$lib/notification-templates/render-preview';
	import { sanitizeNotificationHtml } from '$lib/notification-templates/sanitize-html';
	import { getNotificationModals } from '../../notifications-modals.svelte';
	import { getNotificationsPageState } from '../../notifications-page.svelte';

	const { templateKey }: { templateKey: NotificationTemplateKey } = $props();

	const notificationsPage = getNotificationsPageState();
	const modals = getNotificationModals();
	const document = $derived(notificationsPage.document);
	const invitation = $derived(isInvitationTemplateKey(templateKey));
	const eventEntry = $derived(readEventTemplateEntry(document, templateKey));
	const invitationEntry = $derived(readInvitationTemplateEntry(document));
	const channels = $derived(listChannelsForTemplateKey(templateKey));
	const enabledChannels = $derived(enabledChannelsForTemplateKey(document, templateKey));
	const variables = $derived(NOTIFICATION_TEMPLATE_VARIABLES[templateKey]);

	const baseTitle = $derived(eventEntry?.base_message.title ?? '');
	const baseBody = $derived(eventEntry?.base_message.body ?? '');
	const richSubject = $derived(
		invitation ? invitationEntry?.rich_message.subject ?? '' : eventEntry?.rich_message.subject ?? '',
	);
	const richBody = $derived(
		invitation ? invitationEntry?.rich_message.body ?? '' : eventEntry?.rich_message.body ?? '',
	);
	const simpleBody = $derived(
		invitation ? invitationEntry?.simple_message.body ?? '' : eventEntry?.simple_message.body ?? '',
	);

	const emailPreview = $derived(sanitizeNotificationHtml(
		renderTemplatePreview(richBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES),
	));
	const emailSubjectPreview = $derived(
		renderTemplatePreview(richSubject, NOTIFICATION_TEMPLATE_SAMPLE_VALUES),
	);

	function channelState(channel: NotificationSendChannel) {
		if (!enabledChannels)
			return $t('dataState.unavailable');
		return $t(enabledChannels.includes(channel) ? 'notificationTemplates.flagOn' : 'notificationTemplates.flagOff');
	}

</script>

<div class="space-y-6">
	<DrawerEntityHeader
		name={$t(`notificationTemplates.keys.${templateKey}`)}
		summary={templateKey}
	>
		{#snippet actions()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">
				{#snippet children({ disabled, title })}
					<Button variant="outline"
						disabled={disabled || !document}
						{title}
						onclick={() => modals.open('edit')}
					>
						{$t('common.edit')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">
				{#snippet children({ disabled })}
					<RowActionMenuItem
						disabled={disabled || !document}
						onclick={() => modals.open('reset-key')}
					>
						{$t('notificationTemplates.resetKey')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">{$t('notificationTemplates.channelSettings')}</h2>
		<p class="text-sm">{$t('notificationTemplates.trigger')}: {$t(`notificationTemplates.keys.${templateKey}`)}</p>
		<dl class="grid gap-4 text-sm sm:grid-cols-2">
			{#each channels as channel (channel)}
				<div><dt class="text-xs text-muted-foreground">{$t(`notificationTemplates.channel.${channel}`)}</dt><dd>{channelState(channel)}</dd></div>
			{/each}
		</dl>
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">{$t('notificationTemplates.messagePreviews')}</h2>
		<p class="text-xs text-muted-foreground">{$t('notificationTemplates.sampleNotice')}</p>
		{#each (['in_app', 'push', 'email', 'sms'] as const).filter(channel => channels.includes(channel)) as channel (channel)}
			<div class="space-y-4 rounded-xl border border-border p-4">
				<h3 class="text-sm font-semibold">{$t(`notificationTemplates.channel.${channel}`)} · {channelState(channel)}</h3>
				{#if channel === 'email'}
					{#if richSubject}<p class="break-words text-sm font-semibold">{emailSubjectPreview}</p>{:else}<p class="text-sm">{$t('notificationTemplates.subject')}: {$t('value.notProvided')}</p>{/if}
					{#if richBody}
						<div data-testid="notification-email-preview" class="notification-html-preview break-words text-sm">
							<!-- Semantic sanitized markup provides the same content to screen readers. -->
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html emailPreview}
						</div>
					{:else}<p class="text-sm">{$t('notificationTemplates.body')}: {$t('dataState.unavailable')}</p>{/if}
				{:else if channel === 'sms'}
					<p class="whitespace-pre-wrap break-words text-sm">{simpleBody ? renderTemplatePreview(simpleBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES) : $t('dataState.unavailable')}</p>
				{:else}
					<p class="break-words text-sm font-semibold">{baseTitle ? renderTemplatePreview(baseTitle, NOTIFICATION_TEMPLATE_SAMPLE_VALUES) : $t('value.notProvided')}</p>
					<p class="whitespace-pre-wrap break-words text-sm">{baseBody ? renderTemplatePreview(baseBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES) : $t('dataState.unavailable')}</p>
				{/if}
			</div>
		{/each}
	</section>

	<section class="space-y-4">
		<h2 class="text-xl font-semibold">{$t('notificationTemplates.variables')}</h2>
		<dl class="divide-y divide-border">
			{#each variables as variable (variable)}
				<div class="space-y-2 py-4">
					<dt class="text-sm font-medium">{$t(`notificationTemplates.variable.${variable}`)}</dt>
					<dd class="space-y-2 text-sm">
						<code class="break-all rounded bg-secondary px-2 py-1 text-xs">{`{{${variable}}}`}</code>
						{#if NOTIFICATION_TEMPLATE_SAMPLE_VALUES[variable]}
							<p class="break-words text-xs text-muted-foreground">{$t('notificationTemplates.example')}: {NOTIFICATION_TEMPLATE_SAMPLE_VALUES[variable]}</p>
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</section>
</div>

<style>
	.notification-html-preview :global(p) {
		margin: 0 0 0.5rem;
	}

	.notification-html-preview :global(a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	.notification-html-preview :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}

	.notification-html-preview :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}
</style>
