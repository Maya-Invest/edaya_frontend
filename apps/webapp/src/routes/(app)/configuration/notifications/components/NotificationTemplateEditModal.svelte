<script lang="ts">
	import type {
		NotificationCopyType,
		NotificationGatedChannel,
		NotificationSendChannel,
		NotificationTemplateKey,
	} from '$lib/notification-templates/catalog';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import {
		copyTypeForChannel,
		copyTypesForTemplateKey,
		gatedChannelsForTemplateKey,
		isInvitationTemplateKey,
		previewChannelsForTemplateKey,
		readEventTemplateEntry,
		readInvitationTemplateEntry,
		NOTIFICATION_TEMPLATE_SAMPLE_VALUES,
		NOTIFICATION_TEMPLATE_VARIABLES,
	} from '$lib/notification-templates/catalog';
	import { renderTemplatePreview } from '$lib/notification-templates/render-preview';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getNotificationsPageState } from '../notifications-page.svelte';

	let {
		open = $bindable(false),
		templateKey,
		onReset,
	}: {
		open?: boolean;
		templateKey: NotificationTemplateKey | null;
		onReset?: () => void;
	} = $props();

	const notificationsPage = getNotificationsPageState();
	const document = $derived(notificationsPage.document);

	let busy = $state(false);
	let copyType = $state<NotificationCopyType>('rich_message');
	let previewChannel = $state<NotificationSendChannel>('email');
	let enableEmail = $state(true);
	let enablePush = $state(true);
	let enableSms = $state(false);
	let invitationSmsEnabled = $state(false);
	let baseTitle = $state('');
	let baseBody = $state('');
	let richSubject = $state('');
	let richBody = $state('');
	let simpleBody = $state('');
	let hydratedFromDocument = $state<string | null>(null);

	$effect(() => {
		if (!templateKey) {
			hydratedFromDocument = null;
			return;
		}
		if (!document) {
			return;
		}
		const signature = `${templateKey}:${document.updatedAt ?? ''}`;
		if (hydratedFromDocument === signature) {
			return;
		}
		copyType = copyTypesForTemplateKey(templateKey)[0] ?? 'rich_message';
		previewChannel = previewChannelsForTemplateKey(templateKey)[0] ?? 'email';
		if (isInvitationTemplateKey(templateKey)) {
			const entry = readInvitationTemplateEntry(document);
			richSubject = entry?.rich_message.subject ?? '';
			richBody = entry?.rich_message.body ?? '';
			simpleBody = entry?.simple_message.body ?? '';
			invitationSmsEnabled = Boolean(document.invitationSmsEnabled);
		}
		else {
			const entry = readEventTemplateEntry(document, templateKey);
			enableEmail = entry?.enable_email ?? true;
			enablePush = entry?.enable_push ?? true;
			enableSms = entry?.enable_sms ?? false;
			baseTitle = entry?.base_message.title ?? '';
			baseBody = entry?.base_message.body ?? '';
			richSubject = entry?.rich_message.subject ?? '';
			richBody = entry?.rich_message.body ?? '';
			simpleBody = entry?.simple_message.body ?? '';
		}
		hydratedFromDocument = signature;
	});

	const copyTypes = $derived.by((): NotificationCopyType[] =>
		templateKey ? copyTypesForTemplateKey(templateKey) : ['rich_message'],
	);
	const gatedChannels = $derived.by((): NotificationGatedChannel[] =>
		templateKey ? gatedChannelsForTemplateKey(templateKey) : [],
	);
	const previewChannels = $derived.by((): NotificationSendChannel[] =>
		templateKey ? previewChannelsForTemplateKey(templateKey) : ['email'],
	);
	const variables = $derived(templateKey ? NOTIFICATION_TEMPLATE_VARIABLES[templateKey] : []);
	const invitation = $derived(templateKey ? isInvitationTemplateKey(templateKey) : false);

	const previewCopyType = $derived(copyTypeForChannel(previewChannel));
	const previewSubject = $derived.by(() => {
		if (previewCopyType === 'rich_message') {
			return renderTemplatePreview(richSubject, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
		}
		if (previewCopyType === 'base_message') {
			return renderTemplatePreview(baseTitle, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
		}
		return '';
	});
	const previewBody = $derived.by(() => {
		if (previewCopyType === 'rich_message') {
			return renderTemplatePreview(richBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
		}
		if (previewCopyType === 'base_message') {
			return renderTemplatePreview(baseBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
		}
		return renderTemplatePreview(simpleBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
	});

	const canSubmit = $derived.by(() => {
		if (!templateKey) {
			return false;
		}
		if (copyType === 'rich_message') {
			return richBody.trim().length > 0;
		}
		if (copyType === 'base_message') {
			return baseTitle.trim().length > 0 && baseBody.trim().length > 0;
		}
		return simpleBody.trim().length > 0;
	});

	function channelEnabled(channel: NotificationGatedChannel): boolean {
		if (channel === 'email') {
			return enableEmail;
		}
		if (channel === 'push') {
			return enablePush;
		}
		return enableSms;
	}

	function setChannelEnabled(channel: NotificationGatedChannel, value: boolean) {
		if (channel === 'email') {
			enableEmail = value;
		}
		else if (channel === 'push') {
			enablePush = value;
		}
		else {
			enableSms = value;
		}
	}

	async function submit() {
		if (!canSubmit || busy || !templateKey || !document?.schoolId) {
			return;
		}

		busy = true;
		try {
			const patch = invitation
				? {
					[templateKey]: {
						rich_message: {
							subject: richSubject.trim() || undefined,
							body: richBody.trim(),
						},
						simple_message: {
							body: simpleBody.trim(),
						},
					},
				}
				: {
					[templateKey]: {
						enable_email: enableEmail,
						enable_push: enablePush,
						enable_sms: enableSms,
						base_message: {
							title: baseTitle.trim(),
							body: baseBody.trim(),
						},
						rich_message: {
							subject: richSubject.trim() || undefined,
							body: richBody.trim(),
						},
						simple_message: {
							body: simpleBody.trim(),
						},
					},
				};

			const result = await notificationsPage.updateTemplates({
				templates: patch,
				invitationSmsEnabled: invitation ? invitationSmsEnabled : undefined,
				expectedUpdatedAt: typeof document.updatedAt === 'string' ? document.updatedAt : null,
				successMessage: get(t)('notificationTemplates.toastSaved'),
			});

			if (result) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={templateKey ? $t(`notificationTemplates.keys.${templateKey}`) : ''}
	description={$t('notificationTemplates.editDescription')}
	submitLabel={$t('common.save')}
	cancelLabel={$t('common.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	{#if templateKey}
		<div class="space-y-4">
			{#if gatedChannels.length > 0}
				<div class="space-y-2">
					<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('notificationTemplates.channels')}
					</p>
					<div class="flex flex-wrap gap-3">
						{#each gatedChannels as channel (channel)}
							<label class="flex items-center gap-2 text-sm">
								<Checkbox
									checked={channelEnabled(channel)}
									onCheckedChange={value => setChannelEnabled(channel, value === true)}
								/>
								<span>{$t(`notificationTemplates.channel.${channel}`)}</span>
							</label>
						{/each}
					</div>
				</div>
			{/if}

			{#if invitation}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox bind:checked={invitationSmsEnabled} />
					<span>{$t('notificationTemplates.invitationSms')}</span>
				</label>
			{/if}

			{#if copyTypes.length > 1}
				<div class="flex gap-2 rounded-full bg-secondary p-1">
					{#each copyTypes as item (item)}
						<button
							type="button"
							class={cn(
								'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
								copyType === item
									? 'bg-background text-foreground shadow-soft'
									: 'text-muted-foreground hover:text-foreground',
							)}
							onclick={() => (copyType = item)}
						>
							{$t(`notificationTemplates.copyType.${item}`)}
						</button>
					{/each}
				</div>
			{/if}

			{#if copyType === 'rich_message'}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.subject')}</span>
					<Input bind:value={richSubject} class="rounded-xl" />
				</label>
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea bind:value={richBody} rows={8} class="rounded-xl font-sans tabular-nums text-xs" />
				</label>
			{:else if copyType === 'base_message'}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.titleLabel')}</span>
					<Input bind:value={baseTitle} class="rounded-xl" />
				</label>
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea bind:value={baseBody} rows={6} class="rounded-xl font-sans tabular-nums text-xs" />
				</label>
			{:else}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea bind:value={simpleBody} rows={4} class="rounded-xl font-sans tabular-nums text-xs" />
				</label>
			{/if}

			<div class="rounded-xl border border-border bg-secondary/40 p-4">
				<div class="mb-2 flex items-center justify-between gap-2">
					<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('notificationTemplates.preview')}
					</p>
					{#if previewChannels.length > 1}
						<select
							class="rounded-md border border-border bg-background px-2 py-1 text-xs"
							bind:value={previewChannel}
						>
							{#each previewChannels as channel (channel)}
								<option value={channel}>{$t(`notificationTemplates.channel.${channel}`)}</option>
							{/each}
						</select>
					{/if}
				</div>
				{#if previewSubject}
					<p class="mb-2 text-sm font-semibold">{previewSubject}</p>
				{/if}
				<div class="whitespace-pre-wrap text-sm text-foreground/90">{previewBody}</div>
			</div>

			<div class="rounded-xl border border-dashed border-border p-3">
				<p class="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('notificationTemplates.variables')}
				</p>
				<div class="flex flex-wrap gap-2">
					{#each variables as variable (variable)}
						<code class="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px]">
							{`{{${variable}}}`}
						</code>
					{/each}
				</div>
			</div>

			<div class="flex justify-end">
				<button
					type="button"
					class="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					onclick={onReset}
					disabled={busy || !onReset}
				>
					{$t('notificationTemplates.resetKey')}
				</button>
			</div>
		</div>
	{/if}
</FormModal>
