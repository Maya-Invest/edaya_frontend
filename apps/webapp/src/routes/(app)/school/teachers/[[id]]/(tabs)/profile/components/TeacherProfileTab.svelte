<script lang="ts">
	import type { Teacher } from '$lib/types/school';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone } from '$lib/icons';
	import AccountLinkingSection from '$lib/smart-components/account-linking/AccountLinkingSection.svelte';
	import { get } from 'svelte/store';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';

	const { teacher }: { teacher: Teacher } = $props();

	const teachersPage = getTeachersPageState();

	let optimisticActive = $state<boolean | null>(null);
	let statusBusy = $state(false);

	const active = $derived(optimisticActive ?? teacher.isActive);

	async function handleActiveChange(checked: boolean | 'indeterminate') {
		if (checked === 'indeterminate' || statusBusy) {
			return;
		}

		const previous = active;
		optimisticActive = checked;
		statusBusy = true;
		const ok = await teachersPage.updateStatus({
			teacherId: teacher.id,
			isActive: checked,
			successMessage: get(t)(
				checked ? 'teacher.activateSuccess' : 'teacher.deactivateSuccess',
				{ name: teacher.name },
			),
		});
		statusBusy = false;
		if (ok) {
			optimisticActive = null;
		}
		else {
			optimisticActive = previous;
		}
	}
</script>

<div class="space-y-4">
	<DrawerField label={$t('guardian.fullName')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{teacher.name}</div>
	</DrawerField>
	<DrawerField label={$t('common.code')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			{teacher.code || teacher.id}
		</div>
	</DrawerField>
	<DrawerField label={$t('common.email')}>
		<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			<Mail class="h-3.5 w-3.5 text-muted-foreground" />
			{teacher.email || '—'}
		</div>
	</DrawerField>
	<DrawerField label={$t('common.phone')}>
		<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
			<Phone class="h-3.5 w-3.5 text-muted-foreground" />
			{teacher.phone || '—'}
		</div>
	</DrawerField>
	<PermissionGate permission="STAFF_MANAGE" mode="disable">
		{#snippet children({ disabled })}
			<div class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
				<Checkbox
					checked={active}
					disabled={disabled || statusBusy}
					onCheckedChange={handleActiveChange}
					id={`teacher-active-${teacher.id}`}
				/>
				<Label for={`teacher-active-${teacher.id}`} class="text-sm">
					{$t('teacher.activeLabel')}
				</Label>
			</div>
		{/snippet}
	</PermissionGate>
	<AccountLinkingSection
		kind="teacher"
		targetId={teacher.id}
		subjectId={teacher.subjectId}
		contactEmail={teacher.email}
		displayName={teacher.name}
	/>
</div>
