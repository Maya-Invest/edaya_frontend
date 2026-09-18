<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { buildProfilePhotoContentUrl } from '$lib/api/profile-photo-upload';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import { getStudentsPageState } from '../../../../students-page.svelte';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	const { s }: { s: Student } = $props();

	const profileTab = getStudentProfileTabState();
	const studentsPage = getStudentsPageState();
	const modals = getDrawerUrlModals();
	const pending = $derived(studentsPage?.pendingPhotoFor(s.id));
	const canReview = $derived(canUploadProfilePhoto('STUDENT_UPDATE'));
	const proposedUrl = $derived(pending ? buildProfilePhotoContentUrl(pending.attachmentId) : null);

	async function handleReplace(file: File) {
		return profileTab.updateProfilePhoto({
			studentId: s.id,
			file,
			successMessage: get(t)('student.photo.replacedToast'),
		});
	}
</script>

<div class="grid gap-3 sm:grid-cols-2">
	<div class="rounded-xl border border-border bg-secondary/30 p-3">
		<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{$t('student.photo.current')}</p>
		<div class="mt-3 flex items-center gap-3">
			{#if canReview}
				<ProfilePhotoPicker
					name={s.name}
					initials={s.initials}
					photoUrl={s.photoUrl}
					size="lg"
					onChange={handleReplace}
				/>
			{:else}
				<PersonAvatar name={s.name} initials={s.initials} photoUrl={s.photoUrl} size="lg" />
			{/if}
			<div class="min-w-0">
				<p class="text-sm font-medium">{s.photoUrl ? s.name : $t('student.photo.none')}</p>
				{#if canReview}
					<p class="text-xs text-muted-foreground">{$t('student.photo.replace')}</p>
				{/if}
			</div>
		</div>
	</div>
	<div class="rounded-xl border border-border bg-secondary/30 p-3">
		<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{$t('student.photo.proposed')}</p>
		{#if pending && proposedUrl}
			<div class="mt-3 flex items-center gap-3">
				<PersonAvatar name={s.name} initials={s.initials} photoUrl={proposedUrl} size="lg" />
				<div class="min-w-0 space-y-2">
					<p class="text-sm font-medium">{$t('student.photo.pending')}</p>
					{#if canReview}
						<div class="flex flex-wrap gap-2">
							<Button size="sm" onclick={() => modals?.open('approve-photo')}>
								{$t('student.photo.approve')}
							</Button>
							<Button size="sm" variant="destructive" onclick={() => modals?.open('reject-photo')}>
								{$t('student.photo.reject')}
							</Button>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<p class="mt-3 text-sm text-muted-foreground">{$t('common.none')}</p>
		{/if}
	</div>
</div>
