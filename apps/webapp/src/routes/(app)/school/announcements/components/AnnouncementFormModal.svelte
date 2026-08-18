<script lang="ts">
	import type { Announcement, AnnouncementPriority } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getAnnouncementsPageState } from '../announcements-page.svelte';

	const PRIORITIES: AnnouncementPriority[] = ['normal', 'important', 'urgent'];

	let {
		announcement,
		open = $bindable(false),
		onCreated,
	}: {
		announcement?: Announcement;
		open?: boolean;
		onCreated?: (announcementId: string) => void;
	} = $props();

	const announcementsPage = getAnnouncementsPageState();
	const initialAnnouncement = untrack(() => announcement);

	let busy = $state(false);
	let announcementTitle = $state(initialAnnouncement?.title ?? '');
	let content = $state(initialAnnouncement?.content ?? '');
	let priority = $state<AnnouncementPriority>(initialAnnouncement?.priority ?? 'normal');
	let expiresAt = $state(initialAnnouncement?.expiresAt?.slice(0, 10) ?? '');

	const isEdit = $derived(announcement !== undefined);
	const isDraft = $derived(!announcement || announcement.status === 'draft');
	const priorityLabel = $derived($t(`announcements.priority.${priority}`));
	const minExpiresAt = $derived(new Date().toISOString().slice(0, 10));
	const canSubmit = $derived.by(() => {
		if (!isDraft) {
			return false;
		}
		if (!announcementTitle.trim() || !content.trim()) {
			return false;
		}
		return expiresAt.length === 0 || expiresAt >= minExpiresAt;
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const expiresAtValue = expiresAt.trim().length > 0 ? expiresAt : undefined;
		if (announcement) {
			const ok = await announcementsPage.updateAnnouncement({
				announcementId: announcement.id,
				title: announcementTitle,
				content,
				priority,
				expiresAt: expiresAtValue,
				successMessage: get(t)('announcements.updateSuccess', { title: announcementTitle.trim() }),
			});
			busy = false;
			if (ok) {
				open = false;
			}
		}
		else {
			const announcementId = await announcementsPage.createAnnouncement({
				title: announcementTitle,
				content,
				priority,
				expiresAt: expiresAtValue,
				successMessage: get(t)('announcements.createSuccess', { title: announcementTitle.trim() }),
			});
			busy = false;
			if (announcementId) {
				open = false;
				onCreated?.(announcementId);
			}
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('announcements.editTitle') : $t('announcements.createTitle')}
	description={isEdit ? announcement?.title : $t('announcements.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('announcements.titleLabel')}
		</Label>
		<Input bind:value={announcementTitle} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('announcements.priorityLabel')}
			</Label>
			<Select.Root type="single" value={priority} onValueChange={v => v && (priority = v as AnnouncementPriority)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('announcements.priorityLabel')}>
						{priorityLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each PRIORITIES as entry (entry)}
						<Select.Item value={entry} label={$t(`announcements.priority.${entry}`)}>
							{$t(`announcements.priority.${entry}`)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('announcements.expiresAt')}
			</Label>
			<Input type="date" bind:value={expiresAt} min={minExpiresAt} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('announcements.contentLabel')}
		</Label>
		<Textarea bind:value={content} rows={6} />
	</div>
</FormModal>
