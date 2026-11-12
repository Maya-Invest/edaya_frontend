<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { buildProfilePhotoContentUrl } from '$lib/api/profile-photo-upload';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { hasPermission } from '$lib/permissions';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	const { s }: { s: Student } = $props();
	const owner = getStudentProfileTabState();
	const modals = getDrawerUrlModals();
	const pending = $derived(owner.host.pendingPhotoFor(s.id));
	const canReview = $derived(hasPermission('STUDENT_MANAGE', { classId: s.classId, studentId: s.id }));
	const proposedUrl = $derived(pending ? buildProfilePhotoContentUrl(pending.attachmentId) : null);
</script>
<div class="flex flex-wrap items-center justify-between gap-4">
	<div class="flex min-w-0 items-start gap-4">
		{#if pending && proposedUrl}<PersonAvatar name={s.name} initials={s.initials} photoUrl={proposedUrl} size="lg" class="rounded-full" />{/if}
		<div class="min-w-0 space-y-3">
			<p class="text-sm text-muted-foreground">{$t('student.photo.pending')}</p>
			{#if pending && canReview}<div class="flex flex-wrap gap-2"><Button onclick={() => modals?.open('approve-photo')}>{$t('student.photo.approve')}</Button><Button variant="destructive" onclick={() => modals?.open('reject-photo')}>{$t('student.photo.reject')}</Button></div>{/if}
		</div>
	</div>
</div>
