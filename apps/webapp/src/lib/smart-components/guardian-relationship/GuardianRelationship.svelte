<script lang="ts">
	import type { GuardianLink } from './guardian-relationship-state.svelte';
	import { page } from '$app/stores';
	import GuardianRelationshipFields from '$lib/components/school/shared/GuardianRelationshipFields.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { guardianRelationshipDraft, GuardianRelationshipState } from './guardian-relationship-state.svelte';

	const { guardianId, studentId, link, classId, label, onSaved }: {
		guardianId: string;
		studentId?: string;
		link?: GuardianLink;
		classId?: string;
		label?: string;
		onSaved?: () => void | Promise<void>;
	} = $props();
	const relationship = new GuardianRelationshipState();
	const target = $derived(`${guardianId}:${studentId ?? 'new'}`);
	const modals = createUrlSyncedModals({ allowed: ['guardian-relationship'], getUrl: () => $page.url });
	const currentLink = $derived(relationship.current?.guardianId === guardianId && relationship.current?.studentId === studentId ? relationship.current : link);
	const open = $derived(modals.active === 'guardian-relationship' && modals.target === target);
	const canManage = $derived(hasPermission('PARENT_MANAGE', { classId }));
	let selectedStudent = $state('');
	let fields = $state(guardianRelationshipDraft());
	let initialized = $state(false);
	$effect(() => modals.hydrate());
	$effect(() => {
		if (open && !initialized) {
			initialized = true;
			selectedStudent = studentId ?? '';
			fields = guardianRelationshipDraft(currentLink);
		}
		if (!open)
			initialized = false;
	});
	async function save() {
		if (!canManage || !selectedStudent || !fields.relationship?.trim())
			return;
		if (await relationship.save(guardianId, selectedStudent, fields, currentLink)) {
			modals.close();
			await onSaved?.();
		}
	}
</script>

{#if currentLink}<details class="my-2 text-xs"><summary class="cursor-pointer">{$t('profile.relationship')}: {currentLink.relationship}</summary><dl class="mt-2 grid grid-cols-2 gap-2">{#each ['isPrimary', 'isBillingContact', 'legalGuardian', 'canPickup', 'receivesAcademicReports', 'receivesAttendanceAlerts'] as field (field)}<div><dt class="text-muted-foreground">{$t(`profile.${field}`)}</dt><dd>{$t(currentLink[field as keyof typeof currentLink] ? 'common.yes' : 'common.no')}</dd></div>{/each}<div><dt>{$t('profile.emergencyPriority')}</dt><dd>{currentLink.emergencyContactPriority ?? $t('profile.notProvided')}</dd></div></dl>{#if currentLink.contactRestrictions}<p class="mt-2">{$t('profile.contactRestrictions')}: {currentLink.contactRestrictions}</p>{/if}{#if currentLink.notes}<p class="mt-2">{currentLink.notes}</p>{/if}</details>{/if}
{#if canManage}<Button variant="outline" size="sm" onclick={() => modals.open('guardian-relationship', { target })}>{label ?? $t('profile.relationship')}</Button>{/if}
<FormModal {open} onOpenChange={(value) => {
	if (!value && open)
		modals.close();
}} title={$t('profile.relationship')} submitLabel={$t('common.save')} busy={relationship.busy} submitDisabled={!canManage || !selectedStudent || !fields.relationship?.trim()} onSubmit={save}>
	{#if !studentId}<StudentPicker bind:value={selectedStudent} active={open} />{/if}
	<GuardianRelationshipFields bind:fields />
</FormModal>
