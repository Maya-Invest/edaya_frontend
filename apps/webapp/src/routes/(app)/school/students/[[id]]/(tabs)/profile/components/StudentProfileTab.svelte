<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { relationKey, fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { FileText, Mail, Phone, Users, Plus } from '$lib/icons';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { studentGenderLabelKey } from '$lib/students/format-student-gender';
	import { cn } from '$lib/utils';
	import { pedagogicalNoteToneByCategory, getStudentProfileTabState } from '../student-profile-tab.svelte';
	import AccountLinkingSection from './StudentAccountLinkingSection.svelte';

	const { s }: { s: Student } = $props();

	const profileTab = getStudentProfileTabState();
	const health = $derived(profileTab.healthFor(s.id));
	const linkedGuardians = $derived(profileTab.linkedGuardians(s.id));
	const studentNotes = $derived(profileTab.notesFor(s.id));
	const staff = $derived(profileTab.staffFor(s.id));

	const modals = getDrawerUrlModals();
	const genderLabelKey = $derived(studentGenderLabelKey(s.gender));
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl bg-primary/10 p-3">
			<p class="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
				Groupe
			</p>
			<p class="mt-1 font-display text-xl">{health?.bloodType ?? '—'}</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-3">
			<p class="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
				Allergies
			</p>
			{#if health?.allergies?.length}
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each health.allergies as allergy (allergy)}
						<span class="rounded-full bg-card/70 px-1.5 py-0.5 text-[10px] text-highlight">{allergy}</span>
					{/each}
				</div>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">Aucune</p>
			{/if}
		</div>
		<div class="rounded-xl bg-secondary/60 p-3">
			<p class="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
				Chroniques
			</p>
			{#if health?.chronicConditions?.length}
				<div class="mt-1.5 flex flex-wrap gap-1">
					{#each health.chronicConditions as condition (condition)}
						<span class="rounded-full bg-card/70 px-1.5 py-0.5 text-[10px] text-foreground">{condition}</span>
					{/each}
				</div>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">Aucune</p>
			{/if}
		</div>
	</div>
	{#if health?.medications?.length || health?.lastVisit || health?.notes}
		<div class="grid gap-2 rounded-xl bg-secondary/40 p-3 text-xs sm:grid-cols-2">
			{#if health?.medications?.length}
				<div>
					<span class="text-muted-foreground">Traitements :</span> {health.medications.join(', ')}
				</div>
			{/if}
			{#if health?.lastVisit}
				<div><span class="text-muted-foreground">Dernière visite :</span> {fmtDateFr(health.lastVisit)}</div>
			{/if}
			{#if health?.notes}
				<div class="sm:col-span-2">
					<span class="text-muted-foreground">Notes santé :</span> {health.notes}
				</div>
			{/if}
		</div>
	{/if}
	<DrawerField label={$t('guardian.fullName')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.name}</div>
	</DrawerField>
	<DrawerField label={$t('common.email')}>
		<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.email}</div>
	</DrawerField>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('drawer.birthDate')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{fmtDateFr(s.birthdate)}
			</div>
		</DrawerField>
		<DrawerField label={$t('drawer.guardianLabel')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{s.guardian}
			</div>
		</DrawerField>
	</div>
	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('student.matricule')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 font-mono text-sm">
				{s.matricule?.trim() || '—'}
			</div>
		</DrawerField>
		<DrawerField label={$t('student.gender')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{genderLabelKey ? $t(genderLabelKey) : '—'}
			</div>
		</DrawerField>
	</div>
	<div class="rounded-xl bg-secondary/40 px-3 py-2 text-xs">
		<span class="text-muted-foreground">Statut :</span> {$t(`studentStatus.${s.status}`)}
	</div>

	<AccountLinkingSection
		kind="student"
		targetId={s.id}
		subjectId={s.subjectId}
		contactEmail={s.email}
		displayName={s.name}
	/>

	<div class="space-y-2 border-t border-border pt-4">
		<div class="flex items-center justify-between gap-3">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				Tuteurs · {linkedGuardians.length}
			</Label>
			<PermissionGate permission="STUDENT_UPDATE" mode="disable" tooltip="Droit STUDENT_UPDATE requis.">
				{#snippet children({ disabled, title })}
					<Button
						variant="outline"
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals?.open('link-guardian')}
					>
						<Plus class="mr-1 h-4 w-4" />
						Rattacher
					</Button>
				{/snippet}
			</PermissionGate>
		</div>
		{#if linkedGuardians.length === 0}
			<DrawerEmptyState label={$t('drawer.noGuardian')}>
				{#snippet icon()}
					<Users class="h-5 w-5 text-muted-foreground" />
				{/snippet}
			</DrawerEmptyState>
		{:else}
			<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				<div
					class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
				>
					<div class="col-span-5">{$t('students.student')}</div>
					<div class="col-span-3">{$t('guardian.relationLabel')}</div>
					<div class="col-span-3">{$t('common.phone')}</div>
					<div class="col-span-1"></div>
				</div>
				<ul>
					{#each linkedGuardians as guardian (guardian.id)}
						<li class="border-b border-border last:border-b-0">
							<div class="grid w-full grid-cols-12 items-center gap-4 px-5 py-3.5">
								<div class="col-span-5 flex items-center gap-3">
									<div
										class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-xs font-semibold text-primary-foreground"
									>
										{guardian.initials}
									</div>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{guardian.name}</p>
										<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
											<Mail class="h-3 w-3" />
											{guardian.email}
										</p>
									</div>
								</div>
								<div class="col-span-3">
									<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
										{$t(relationKey[guardian.relation])}
									</span>
								</div>
								<div class="col-span-3">
									<p class="flex items-center gap-1 text-xs text-muted-foreground">
										<Phone class="h-3 w-3" />
										{guardian.phone}
									</p>
								</div>
								<div class="col-span-1 flex items-center gap-1">
									<button
										class="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
									>
										<Mail class="h-3.5 w-3.5" />
									</button>
									<button
										class="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
									>
										<Phone class="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>

	<div class="space-y-2 border-t border-border pt-4">
		<div class="flex items-center justify-between gap-3">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				Notes pédagogiques · {studentNotes.length}
			</Label>
			<PermissionGate permission="STUDENT_UPDATE" mode="disable" tooltip="Droit STUDENT_UPDATE requis.">
				{#snippet children({ disabled, title })}
					<Button
						variant="outline"
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals?.open('note')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('note.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		</div>
		{#if studentNotes.length === 0}
			<DrawerEmptyState label="Aucune note pédagogique.">
				{#snippet icon()}
					<FileText class="h-5 w-5 text-muted-foreground" />
				{/snippet}
			</DrawerEmptyState>
		{:else}
			<ul class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				{#each studentNotes as note (note.id)}
					{@const author = staff.find(member => member.id === note.authorId)}
					<li class="border-b border-border px-4 py-3 last:border-b-0">
						<div class="flex items-center justify-between gap-2">
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
									pedagogicalNoteToneByCategory[note.category],
								)}
							>
								{note.category}
							</span>
							<div class="flex items-center gap-2">
								<span class="font-mono text-[10px] text-muted-foreground">{fmtDateFr(note.date)}</span>
								<PermissionGate
									permission="STUDENT_UPDATE"
									mode="disable"
									tooltip="Droit STUDENT_UPDATE requis."
								>
									{#snippet children({ disabled, title })}
										<Button
											variant="ghost"
											class="h-7 rounded-full px-2 text-[11px]"
											{disabled}
											{title}
											onclick={() => modals?.open('note', { target: note.id })}
										>
											{$t('common.edit')}
										</Button>
									{/snippet}
								</PermissionGate>
							</div>
						</div>
						<p class="mt-1.5 text-sm">{note.content}</p>
						<p class="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
							{#if author}
								<PersonAvatar
									name={author.name}
									initials={author.initials}
									photoUrl={author.photoUrl}
									size="xs"
								/>
							{/if}
							<span>{author?.name ?? '—'}</span>
							{#if author?.department}
								<span>· {author.department}</span>
							{/if}
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
