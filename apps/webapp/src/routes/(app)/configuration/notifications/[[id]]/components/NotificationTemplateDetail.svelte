<script lang="ts">
	import type { NotificationGatedChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import {
		copyTypesForTemplateKey,
		gatedChannelsForTemplateKey,
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
	const gatedChannels = $derived(gatedChannelsForTemplateKey(templateKey));
	const copyTypes = $derived(copyTypesForTemplateKey(templateKey));
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

	function flagLabel(enabled: boolean) {
		return enabled ? $t('notificationTemplates.flagOn') : $t('notificationTemplates.flagOff');
	}

	function channelEnabled(channel: NotificationGatedChannel): boolean {
		if (channel === 'email') {
			return eventEntry?.enable_email ?? false;
		}
		if (channel === 'push') {
			return eventEntry?.enable_push ?? false;
		}
		return eventEntry?.enable_sms ?? false;
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
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
						{disabled}
						{title}
						onclick={() => modals.open('edit')}
					>
						{$t('common.edit')}
					</button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet overflow()}
			<PermissionGate permission="SCHOOL_LIFECYCLE_MANAGE" mode="disable">
				{#snippet children({ disabled })}
					<RowActionMenuItem
						{disabled}
						onclick={() => modals.open('reset-key')}
					>
						{$t('notificationTemplates.resetKey')}
					</RowActionMenuItem>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	{#if gatedChannels.length > 0}
		<DrawerField label={$t('notificationTemplates.channels')}>
			<div class="flex flex-wrap gap-2">
				<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium">
					{$t('notificationTemplates.channel.in_app')} · {$t('notificationTemplates.flagOn')}
				</span>
				{#each gatedChannels as channel (channel)}
					<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium">
						{$t(`notificationTemplates.channel.${channel}`)} · {flagLabel(channelEnabled(channel))}
					</span>
				{/each}
			</div>
		</DrawerField>
	{/if}

	{#if !invitation}
		<DrawerField label={$t('notificationTemplates.copyType.base_message')}>
			<div class="space-y-2 rounded-md border border-input bg-secondary/30 px-3 py-2">
				<p class="text-sm font-semibold">{renderTemplatePreview(baseTitle, NOTIFICATION_TEMPLATE_SAMPLE_VALUES)}</p>
				<p class="whitespace-pre-wrap text-sm text-foreground/90">
					{renderTemplatePreview(baseBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES)}
				</p>
			</div>
		</DrawerField>
	{/if}

	<DrawerField label={$t('notificationTemplates.copyType.rich_message')}>
		<div class="space-y-2 rounded-md border border-input bg-secondary/30 px-3 py-2">
			{#if emailSubjectPreview}
				<p class="text-sm font-semibold">{emailSubjectPreview}</p>
			{/if}
			<div
				data-testid="notification-email-preview"
				class="notification-html-preview text-sm text-foreground/90"
			>
				<!-- Sanitized to p/br/strong/em/a/ul/ol/li before render. -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html emailPreview}
			</div>
		</div>
	</DrawerField>

	{#if copyTypes.includes('simple_message')}
		<DrawerField label={$t('notificationTemplates.copyType.simple_message')}>
			<div class="min-h-10 whitespace-pre-wrap rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{renderTemplatePreview(simpleBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES)}
			</div>
		</DrawerField>
	{/if}

	<DrawerField label={$t('notificationTemplates.variables')}>
		<div class="flex flex-wrap gap-2">
			{#each variables as variable (variable)}
				<code class="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px]">
					{`{{${variable}}}`}
				</code>
			{/each}
		</div>
	</DrawerField>
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
