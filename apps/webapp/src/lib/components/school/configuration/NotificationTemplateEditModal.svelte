<script lang="ts">
	import type { SchoolNotificationTemplatesRow } from '$lib/api/notification-templates-data';
	import type { NotificationChannel, NotificationTemplateKey } from '$lib/notification-templates/catalog';
	import {
		resetSchoolNotificationTemplatesMutation,
		updateSchoolNotificationTemplatesMutation,
	} from '$lib/api/mutations/notification-templates.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { confirmAction } from '$lib/confirm-action';
	import { t } from '$lib/i18n';
	import {
		channelsForTemplateKey,
		NOTIFICATION_TEMPLATE_SAMPLE_VALUES,
		NOTIFICATION_TEMPLATE_VARIABLES,

	} from '$lib/notification-templates/catalog';
	import { renderTemplatePreview } from '$lib/notification-templates/render-preview';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		templateKey,
		document,
		onSaved,
	}: {
		open?: boolean;
		templateKey: NotificationTemplateKey | null;
		document: SchoolNotificationTemplatesRow | null;
		onSaved?: (next: SchoolNotificationTemplatesRow) => void;
	} = $props();

	let busy = $state(false);
	let channel = $state<NotificationChannel>('email');
	let emailSubject = $state('');
	let emailBody = $state('');
	let inAppSubject = $state('');
	let inAppBody = $state('');
	let hydratedKey = $state<NotificationTemplateKey | null>(null);

	const channels = $derived.by((): NotificationChannel[] =>
		templateKey ? channelsForTemplateKey(templateKey) : ['email'],
	);
	const variables = $derived(templateKey ? NOTIFICATION_TEMPLATE_VARIABLES[templateKey] : []);
	const previewSubject = $derived(
		channel === 'email'
			? renderTemplatePreview(emailSubject, NOTIFICATION_TEMPLATE_SAMPLE_VALUES)
			: renderTemplatePreview(inAppSubject, NOTIFICATION_TEMPLATE_SAMPLE_VALUES),
	);
	const previewBody = $derived(
		channel === 'email'
			? renderTemplatePreview(emailBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES)
			: renderTemplatePreview(inAppBody, NOTIFICATION_TEMPLATE_SAMPLE_VALUES),
	);
	const canSubmit = $derived.by(() => {
		if (!templateKey) {
			return false;
		}
		return channel === 'email' ? emailBody.trim().length > 0 : inAppBody.trim().length > 0;
	});

	function readEntry(key: NotificationTemplateKey) {
		const templates = document?.templates as Record<string, {
			email?: { subject?: string; body?: string };
			in_app?: { subject?: string; body?: string };
		}> | undefined;
		return templates?.[key];
	}

	function hydrateForm() {
		if (!templateKey || !document) {
			return;
		}
		const entry = readEntry(templateKey);
		emailSubject = entry?.email?.subject ?? '';
		emailBody = entry?.email?.body ?? '';
		inAppSubject = entry?.in_app?.subject ?? '';
		inAppBody = entry?.in_app?.body ?? '';
		channel = channels[0] ?? 'email';
		hydratedKey = templateKey;
	}

	$effect(() => {
		if (!open || !templateKey) {
			return;
		}
		if (templateKey !== hydratedKey) {
			hydrateForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy || !templateKey || !document?.schoolId) {
			return;
		}

		busy = true;
		try {
			const patch: Record<string, unknown> = {
				[templateKey]: channel === 'email'
					? {
						email: {
							subject: emailSubject.trim() || undefined,
							body: emailBody.trim(),
						},
					}
					: {
						in_app: {
							subject: inAppSubject.trim() || undefined,
							body: inAppBody.trim(),
						},
					},
			};

			const result = await updateSchoolNotificationTemplatesMutation({
				schoolId: document.schoolId,
				templates: patch,
				expectedUpdatedAt: document.updatedAt,
			}, {
				successMessage: get(t)('notificationTemplates.toastSaved'),
				onSuccess: onSaved,
			});

			if (result) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}

	async function resetKey() {
		if (busy || !templateKey || !document?.schoolId) {
			return;
		}
		if (!confirmAction(get(t)('notificationTemplates.resetKeyConfirm'))) {
			return;
		}

		busy = true;
		try {
			const result = await resetSchoolNotificationTemplatesMutation({
				schoolId: document.schoolId,
				templateKey,
			}, {
				successMessage: get(t)('notificationTemplates.toastResetKey'),
				onSuccess: onSaved,
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
			{#if channels.length > 1}
				<div class="flex gap-2 rounded-full bg-secondary p-1">
					{#each channels as item (item)}
						<button
							type="button"
							class={cn(
								'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
								channel === item
									? 'bg-background text-foreground shadow-soft'
									: 'text-muted-foreground hover:text-foreground',
							)}
							onclick={() => (channel = item)}
						>
							{$t(`notificationTemplates.channel.${item}`)}
						</button>
					{/each}
				</div>
			{/if}

			{#if channel === 'email'}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.subject')}</span>
					<Input bind:value={emailSubject} class="rounded-xl" />
				</label>
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea bind:value={emailBody} rows={8} class="rounded-xl font-mono text-xs" />
				</label>
			{:else}
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.subject')}</span>
					<Input bind:value={inAppSubject} class="rounded-xl" />
				</label>
				<label class="block space-y-1.5 text-sm">
					<span class="text-muted-foreground">{$t('notificationTemplates.body')}</span>
					<Textarea bind:value={inAppBody} rows={6} class="rounded-xl font-mono text-xs" />
				</label>
			{/if}

			<div class="rounded-xl border border-border bg-secondary/40 p-4">
				<p class="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('notificationTemplates.preview')}
				</p>
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
					onclick={resetKey}
					disabled={busy}
				>
					{$t('notificationTemplates.resetKey')}
				</button>
			</div>
		</div>
	{/if}
</FormModal>
