<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { createStudentMutation } from '$lib/api/mutations/student.mutations';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		hierarchy,
		defaultClassGroupId,
		open = $bindable(false),
		onCreated,
	}: {
		hierarchy: { level: string; classes: ClassNode[] }[];
		defaultClassGroupId?: string;
		open?: boolean;
		onCreated?: (studentId: string) => void;
	} = $props();

	let busy = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let birthDate = $state('');
	let classGroupId = $state('');
	let sendAccountInvitation = $state(true);
	let inviteEmail = $state('');
	let wasOpen = $state(false);

	const classOptions = $derived(
		hierarchy.flatMap(group =>
			group.classes.map(classNode => ({
				id: classNode.id,
				label: `${classNode.name} · ${group.level}`,
			})),
		),
	);

	const selectedClassLabel = $derived(
		classOptions.find(option => option.id === classGroupId)?.label ?? '',
	);

	const canSubmit = $derived.by(() => {
		if (!firstName.trim() || !lastName.trim() || !classGroupId) {
			return false;
		}
		return !sendAccountInvitation || inviteEmail.trim().length > 0;
	});

	function defaultClassId() {
		if (defaultClassGroupId && classOptions.some(option => option.id === defaultClassGroupId))
			return defaultClassGroupId;
		return classOptions[0]?.id ?? '';
	}

	function resetForm() {
		firstName = '';
		lastName = '';
		birthDate = '';
		classGroupId = defaultClassId();
		sendAccountInvitation = true;
		inviteEmail = '';
	}

	function handleClassChange(value: string | undefined) {
		if (value)
			classGroupId = value;
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		try {
			const fullName = `${firstName.trim()} ${lastName.trim()}`;
			const studentId = await createStudentMutation({
				firstName,
				lastName,
				classGroupId,
				birthDate,
				sendAccountInvitation,
				inviteEmail,
				successMessage: get(t)('student.createSuccess', { name: fullName }),
			});
			if (studentId) {
				open = false;
				onCreated?.(studentId);
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('student.createTitle')}
	description={$t('student.createDescription')}
	submitLabel={$t('students.newStudent')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} autocomplete="given-name" />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} autocomplete="family-name" />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.birthDate')}
		</Label>
		<Input type="date" bind:value={birthDate} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('students.class')}
		</Label>
		{#if classOptions.length === 0}
			<p class="rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
				{$t('student.noClassesAvailable')}
			</p>
		{:else}
			<Select.Root type="single" value={classGroupId} onValueChange={handleClassChange}>
				<Select.Trigger>
					<Select.Value placeholder={$t('student.selectClass')}>
						{selectedClassLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each classOptions as option (option.id)}
						<Select.Item value={option.id} label={option.label}>
							{option.label}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
	<div class="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
		<Checkbox bind:checked={sendAccountInvitation} id="student-send-invite" />
		<div class="space-y-1">
			<Label for="student-send-invite" class="text-sm font-medium">
				{$t('invitation.createModal.sendInvite')}
			</Label>
			<p class="text-xs text-muted-foreground">{$t('invitation.createModal.studentInviteHint')}</p>
		</div>
	</div>
	{#if sendAccountInvitation}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('invitation.createModal.inviteEmail')}
			</Label>
			<Input type="email" bind:value={inviteEmail} autocomplete="email" />
		</div>
	{/if}
</FormModal>
