<script lang="ts">
	import type { AnnouncementTargetKind, Guardian, StaffMember, Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import GuardianPicker from '$lib/smart-components/guardian-picker/GuardianPicker.svelte';
	import StaffPicker from '$lib/smart-components/staff-picker/StaffPicker.svelte';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { get } from 'svelte/store';
	import { getAnnouncementsPageState } from '../../announcements-page.svelte';
	import { announcementTargetNeedsEntity } from '../../lib/announcement-target-label';

	const SCOPED_TARGET_KINDS: AnnouncementTargetKind[] = [
		'class_group',
		'grade_level',
		'staff_member',
		'guardian',
		'student',
	];

	const BROADCAST_TARGET_KINDS: AnnouncementTargetKind[] = [
		'school',
		'all_staff',
		'all_guardians',
		'all_students',
	];

	let {
		announcementId,
		open = $bindable(false),
	}: {
		announcementId: string;
		open?: boolean;
	} = $props();

	const announcementsPage = getAnnouncementsPageState();

	let busy = $state(false);
	let targetKind = $state<AnnouncementTargetKind>('school');
	let targetId = $state('');

	const sortedLevels = $derived(sortGradeLevels(academicContext.gradeLevels));
	const needsEntity = $derived(announcementTargetNeedsEntity(targetKind));
	const targetKindLabel = $derived($t(`announcements.targetKind.${targetKind}`));

	const entityOptions = $derived.by(() => {
		switch (targetKind) {
			case 'class_group':
				return academicContext.classes.map(entry => ({ id: entry.id, label: entry.name }));
			case 'grade_level':
				return sortedLevels.map(entry => ({ id: entry.id, label: entry.name }));
			default:
				return [];
		}
	});

	const usesPersonPicker = $derived(
		targetKind === 'staff_member' || targetKind === 'guardian' || targetKind === 'student',
	);

	const selectedEntityLabel = $derived(
		entityOptions.find(entry => entry.id === targetId)?.label ?? '',
	);

	const canSubmit = $derived(!needsEntity || targetId.length > 0);

	function resetForm() {
		targetKind = 'school';
		targetId = '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	$effect(() => {
		if (!needsEntity) {
			targetId = '';
			return;
		}
		if (usesPersonPicker) {
			const pool: readonly (Student | Guardian | StaffMember)[] = targetKind === 'student'
				? announcementsPage.students
				: targetKind === 'guardian'
				? announcementsPage.guardians
				: announcementsPage.staff;
			if (!pool.some(entry => entry.id === targetId)) {
				targetId = '';
			}
			return;
		}
		if (!entityOptions.some(entry => entry.id === targetId)) {
			targetId = entityOptions[0]?.id ?? '';
		}
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const ok = await announcementsPage.addTarget({
			announcementId,
			targetKind,
			targetId: needsEntity ? targetId : undefined,
			successMessage: get(t)('announcements.targetAdded'),
		});
		busy = false;
		if (ok) {
			open = false;
			resetForm();
		}
	}
</script>

<FormModal
	bind:open
	title={$t('announcements.addTargetTitle')}
	description={$t('announcements.addTargetDescription')}
	submitLabel={$t('common.add')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('announcements.targetKindLabel')}
		</Label>
		<Select.Root type="single" value={targetKind} onValueChange={v => v && (targetKind = v as AnnouncementTargetKind)}>
			<Select.Trigger>
				<Select.Value placeholder={$t('announcements.targetKindLabel')}>
					{targetKindLabel}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each BROADCAST_TARGET_KINDS as entry (entry)}
					<Select.Item value={entry} label={$t(`announcements.targetKind.${entry}`)}>
						{$t(`announcements.targetKind.${entry}`)}
					</Select.Item>
				{/each}
				{#each SCOPED_TARGET_KINDS as entry (entry)}
					<Select.Item value={entry} label={$t(`announcements.targetKind.${entry}`)}>
						{$t(`announcements.targetKind.${entry}`)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if needsEntity}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('announcements.targetEntityLabel')}
			</Label>
			{#if targetKind === 'student'}
				<StudentPicker bind:value={targetId} active={open} />
			{:else if targetKind === 'guardian'}
				<GuardianPicker bind:value={targetId} active={open} />
			{:else if targetKind === 'staff_member'}
				<StaffPicker bind:value={targetId} active={open} />
			{:else}
				<Select.Root type="single" value={targetId} onValueChange={v => v && (targetId = v)}>
					<Select.Trigger>
						<Select.Value placeholder={$t('announcements.targetEntityLabel')}>
							{selectedEntityLabel}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="z-[100]">
						{#each entityOptions as entry (entry.id)}
							<Select.Item value={entry.id} label={entry.label}>
								{entry.label}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}
		</div>
	{/if}
</FormModal>
