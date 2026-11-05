<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import PersonProfileFields from '$lib/components/school/shared/PersonProfileFields.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { personFieldDraft } from '$lib/people-profile-fields';
	import IdentifierInput from '$lib/smart-components/human-identifier/IdentifierInput.svelte';
	import { get } from 'svelte/store';
	import { getStudentsPageState } from '../students-page.svelte';

	let { hierarchy, defaultClassGroupId, open = $bindable(false), onOpenChange, onCreated, createStudent }: {
		hierarchy: {
			level: string;
			classes: ClassNode[];
		}[];
		defaultClassGroupId?: string;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onCreated?: (studentId: string) => void;
		createStudent?: (input: {
			firstName: string;
			profile?: Record<string, string>;
			lastName: string;
			classGroupId: string;
			birthDate?: string;
			sendAccountInvitation?: boolean;
			inviteEmail?: string;
			successMessage?: string;
		}) => Promise<string | null>;
	} = $props();
	const studentsPage = getStudentsPageState();
	let busy = $state(false);
	let additional = $state<Record<string, string>>(personFieldDraft('student'));
	let firstName = $state('');
	let lastName = $state('');
	let birthDate = $state('');
	let classGroupId = $state('');
	let sendAccountInvitation = $state(true);
	let inviteEmail = $state('');
	let wasOpen = $state(false);
	const classOptions = $derived(hierarchy.flatMap(group => group.classes.map(classNode => ({
		id: classNode.id,
		label: `${classNode.name} · ${group.level}`,
	}))));
	const selectedClassLabel = $derived(classOptions.find(option => option.id === classGroupId)?.label ?? '');
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
		additional = personFieldDraft('student');
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
			const resolvedCreateStudent = createStudent ?? (input => studentsPage.createStudent(input));
			const studentId = await resolvedCreateStudent({
				profile: additional,
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
	{onOpenChange}
	title={$t('student.createTitle')}
	description={$t('student.createDescription')}
	submitLabel={$t('students.newStudent')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<IdentifierInput bind:profile={additional} />
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} autocomplete="given-name" aria-label={$t('common.firstName')} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} autocomplete="family-name" aria-label={$t('common.lastName')} />
		</div>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('drawer.birthDate')}
		</Label>
		<Input type="date" bind:value={birthDate} aria-label={$t('drawer.birthDate')} />
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
	<div class="flex items-start gap-3 rounded-collection border border-border bg-secondary/30 px-3 py-2.5">
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
	<details class="space-y-3"><summary class="cursor-pointer text-sm font-medium">{$t('profile.additionalFields')}</summary><PersonProfileFields kind="student" bind:values={additional} exclude={['identifier']} /></details>
</FormModal>
