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
	import SelectField from '$lib/components/ui/SelectField.svelte';
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
	import { sanitizeNotificationHtml } from '$lib/notification-templates/sanitize-html';
	import { cn } from '$lib/utils';
	import { onDestroy, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getNotificationsPageState } from '../notifications-page.svelte';
	import NotificationRichTextEditor from './NotificationRichTextEditor.svelte';

	let {
		open = $bindable(false),
		templateKey,
	}: {
		open?: boolean;
		templateKey: NotificationTemplateKey | null;
	} = $props();

	const notificationsPage = getNotificationsPageState();
	const document = $derived(notificationsPage.document);

	let busy = $state(false);
	let session = Symbol('template-editor-session');
	let baseline = $state('');
	onDestroy(() => {
		session = Symbol('template-editor-session');
	});
	let copyType = $state<NotificationCopyType>('rich_message');
	let previewChannel = $state<NotificationSendChannel>('email');
	let enableEmail = $state(true);
	let enablePush = $state(true);
	let enableSms = $state(false);
	let baseTitle = $state('');
	let baseBody = $state('');
	let richSubject = $state('');
	let richBody = $state('');
	let simpleBody = $state('');
	let openingRevision = $state<string | null>(null);
	let hydratedFromDocument = $state<string | null>(null);
	let focusedField = $state<'richSubject' | 'richBody' | 'baseTitle' | 'baseBody' | 'simpleBody'>('richBody');
	let insertRichPlaceholder = $state<(text: string) => void>(() => {});
	let lastTextField = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

	$effect(() => {
		if (!open || !templateKey) {
			session = Symbol('template-editor-session');
			hydratedFromDocument = null;
			return;
		}
		if (!document) {
			return;
		}
		const signature = `${document.schoolId}:${templateKey}`;
		if (hydratedFromDocument === signature) {
			return;
		}
		session = Symbol('template-editor-session');
		busy = false;
		openingRevision = typeof document.updatedAt === 'string' ? document.updatedAt : null;
		copyType = copyTypesForTemplateKey(templateKey)[0] ?? 'rich_message';
		previewChannel = previewChannelsForTemplateKey(templateKey)[0] ?? 'email';
		if (isInvitationTemplateKey(templateKey)) {
			const entry = readInvitationTemplateEntry(document);
			richSubject = entry?.rich_message.subject ?? '';
			richBody = entry?.rich_message.body ?? '';
			simpleBody = entry?.simple_message.body ?? '';
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
		baseline = untrack(draftSignature);
		hydratedFromDocument = signature;
	});

	function draftSignature() {
		return JSON.stringify([enableEmail, enablePush, enableSms, baseTitle, baseBody, richSubject, richBody, simpleBody]);
	}
	const dirty = $derived(Boolean(hydratedFromDocument) && draftSignature() !== baseline);

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
			return sanitizeNotificationHtml(
				renderTemplatePreview(richBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES),
			);
		}
		if (previewCopyType === 'base_message') {
			return renderTemplatePreview(baseBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
		}
		return renderTemplatePreview(simpleBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES);
	});

	const canSubmit = $derived.by(() => {
		if (!templateKey || !document) {
			return false;
		}
		if (copyType === 'rich_message') {
			return richBody.replace(/<[^>]+>/g, '').trim().length > 0;
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

	function insertAtCaret(current: string, token: string): string {
		const el = lastTextField;
		if (!el || !el.isConnected) {
			return `${current}${token}`;
		}
		const start = el.selectionStart ?? current.length;
		const end = el.selectionEnd ?? current.length;
		const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
		queueMicrotask(() => {
			el.focus();
			const pos = start + token.length;
			el.setSelectionRange(pos, pos);
		});
		return next;
	}

	function rememberTextField(event: FocusEvent) {
		const target = event.currentTarget;
		lastTextField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
			? target
			: null;
	}

	function insertPlaceholder(name: string) {
		const token = `{{${name}}}`;
		if (copyType === 'rich_message' && focusedField === 'richBody') {
			insertRichPlaceholder(token);
			return;
		}
		if (focusedField === 'richSubject') {
			richSubject = insertAtCaret(richSubject, token);
			return;
		}
		if (focusedField === 'baseTitle') {
			baseTitle = insertAtCaret(baseTitle, token);
			return;
		}
		if (focusedField === 'baseBody') {
			baseBody = insertAtCaret(baseBody, token);
			return;
		}
		if (focusedField === 'simpleBody') {
			simpleBody = insertAtCaret(simpleBody, token);
		}
	}

	async function submit() {
		if (!canSubmit || busy || !templateKey || !document?.schoolId) {
			return;
		}

		const submittedSession = session;
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
				invitationSmsEnabled: invitation ? false : undefined,
				expectedUpdatedAt: openingRevision,
				successMessage: get(t)('notificationTemplates.toastSaved'),
			});

			if (result && session === submittedSession) {
				open = false;
			}
		}
		finally {
			if (session === submittedSession)
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
	{dirty}
	onSubmit={submit}
>
	{#if !document}
		<p role="status">{$t('dataState.unavailableDescription')}</p>
	{:else if templateKey}
		<fieldset disabled={busy} class="space-y-4">
			{#if gatedChannels.length > 0}
				<div class="space-y-2">
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

			{#if copyTypes.length > 1}
				<div class="flex gap-2 rounded-full bg-secondary p-1">
					{#each copyTypes as item (item)}
						<button
							type="button"
							class={cn(
								'flex-1 min-h-11 rounded-full px-3 py-2 text-sm font-medium transition-colors',
								copyType === item
									? 'bg-background text-foreground shadow-soft'
									: 'text-muted-foreground hover:text-foreground',
							)}
							onclick={() => {
								copyType = item;
								previewChannel = item === 'rich_message'
									? 'email'
									: item === 'simple_message'
									? 'sms'
									: 'in_app';
								focusedField = item === 'rich_message'
									? 'richBody'
									: item === 'base_message'
									? 'baseBody'
									: 'simpleBody';
							}}
						>
							{$t(`notificationTemplates.copyType.${item}`)}
						</button>
					{/each}
				</div>
			{/if}

			{#if copyType === 'rich_message'}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.subject')}</span>
					<Input
						bind:value={richSubject}

						onfocus={(event) => {
							focusedField = 'richSubject';
							rememberTextField(event);
						}}
					/>
				</label>
				<div class="space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<NotificationRichTextEditor
						bind:value={richBody}
						disabled={busy}
						onFocus={() => (focusedField = 'richBody')}
						onReady={(api) => {
							insertRichPlaceholder = api.insertPlaceholder;
						}}
					/>
				</div>
			{:else if copyType === 'base_message'}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.titleLabel')}</span>
					<Input
						bind:value={baseTitle}

						onfocus={(event) => {
							focusedField = 'baseTitle';
							rememberTextField(event);
						}}
					/>
				</label>
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea
						bind:value={baseBody}
						rows={6}

						onfocus={(event) => {
							focusedField = 'baseBody';
							rememberTextField(event);
						}}
					/>
				</label>
			{:else}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea
						bind:value={simpleBody}
						rows={4}

						onfocus={(event) => {
							focusedField = 'simpleBody';
							rememberTextField(event);
						}}
					/>
				</label>
			{/if}

			<div class="rounded-collection border border-border bg-secondary/40 p-4">
				<div class="mb-2 flex items-center justify-between gap-2">
					<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{$t('notificationTemplates.preview')}
					</p>
					{#if previewChannels.length > 1}
						<SelectField
							class="border border-border bg-background text-xs"
							bind:value={previewChannel}
						>
							{#each previewChannels as channel (channel)}
								<option value={channel}>{$t(`notificationTemplates.channel.${channel}`)}</option>
							{/each}
						</SelectField>
					{/if}
				</div>
				{#if previewSubject}
					<p class="mb-2 text-sm font-semibold">{previewSubject}</p>
				{/if}
				{#if previewCopyType === 'rich_message'}
					<div class="notification-html-preview text-sm text-foreground/90">
						<!-- Sanitized to p/br/strong/em/a/ul/ol/li before render. -->
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html previewBody}
					</div>
				{:else}
					<div class="whitespace-pre-wrap text-sm text-foreground/90">{previewBody}</div>
				{/if}
			</div>

			<div class="rounded-collection border border-dashed border-border p-3">
				<p class="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{$t('notificationTemplates.variables')}
				</p>
				<div class="flex flex-wrap gap-2">
					{#each variables as variable (variable)}
						<button
							type="button"
							class="min-h-11 rounded-full bg-secondary px-3 py-2 font-mono text-xs hover:bg-secondary/80"
							onclick={() => insertPlaceholder(variable)}
						>
							{`{{${variable}}}`}
						</button>
					{/each}
				</div>
			</div>
		</fieldset>
	{/if}
</FormModal>

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
