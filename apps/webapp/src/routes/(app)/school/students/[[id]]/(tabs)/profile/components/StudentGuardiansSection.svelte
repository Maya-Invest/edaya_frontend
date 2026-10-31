<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { guardianRelationLabel } from '$lib/components/school/shared/drawer-constants';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import { t } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { hasPermission } from '$lib/permissions';
	import GuardianRelationship from '$lib/smart-components/guardian-relationship/GuardianRelationship.svelte';
	import { BADGE } from '$lib/ui-tones';
	import { tick } from 'svelte';
	import { navigateToStudentGuardian, restoreStudentGuardianFocus } from '../../../../lib/student-guardian-navigation';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';
	import StudentProfileSectionQuery from './StudentProfileSectionQuery.svelte';

	const { s }: { s: Student } = $props();
	const owner = getStudentProfileTabState();
	const modals = getDrawerUrlModals();
	let query = $state('');
	const rows = $derived(owner.linkedGuardians(s.id));
	const visible = $derived(rows.filter(row => `${row.name} ${row.email} ${row.phone}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));
	const columns = $derived<ListEntityTableColumn[]>([
		{ key: 'guardian', label: $t('people.guardians'), span: 12, card: { zone: 'body', showLabel: false } },
	]);
	$effect(() => {
		if (rows.length && $page.state.studentGuardianReturn) {
			void tick().then(() => restoreStudentGuardianFocus($page.state.studentGuardianReturn));
		}
	});
</script>
<StudentProfileSectionQuery section="guardians">
	<ListPageHeader level="section" surface="related" title={`${$t('people.guardians')} · ${rows.length}`}>
		{#snippet search()}<ListSearchField value={query} oninput={event => query = event.currentTarget.value} placeholder={$t('student.profile.searchGuardians')} />{/snippet}
		{#snippet primary()}{#if hasPermission('PARENT_MANAGE', { classId: s.classId, studentId: s.id })}<Button variant="ghost" onclick={() => modals?.open('link-guardian')}>{$t('student.linkGuardian')}</Button>{/if}{/snippet}
	</ListPageHeader>
	<ListEntityCards showEndSummary={false} {columns} rows={visible} total={rows.length} visibleCount={visible.length} emptyLabel={$t(rows.length ? 'students.noMatch' : 'drawer.noGuardian')}>
		{#snippet field(guardian)}
			{@const link = guardian.links?.find(link => link.studentId === s.id)}
			<div class="ui-student-guardian" role="group" aria-label={guardian.name}>
				<div class="ui-student-guardian-heading">
					<div class="ui-student-guardian-identity">
						<div class="min-w-0"><button type="button" class="ui-record-target control-focus" data-guardian-id={guardian.id} onclick={() => navigateToStudentGuardian(guardian.id)}>{guardian.name}</button></div>
						<span class="ui-student-guardian-badge text-xs font-normal {BADGE}" data-testid="guardian-relationship-badge"><span class="sr-only">{$t('guardian.relationLabel')}: </span><span>{$t(guardianRelationLabel(link?.relationship || 'profile.notProvided'))}</span></span>
					</div>
					<GuardianRelationship presentation="action" menuLabel={`${$t('list.rowActions')} · ${guardian.name}`} label={$t('common.edit')} guardianId={guardian.id} studentId={s.id} classId={s.classId} {link} onSaved={() => owner.invalidateIfStale()} />
				</div>
				<dl class="ui-student-guardian-contacts text-sm" data-testid="guardian-contact-details">
					<div class="min-w-0"><dt class="text-muted-foreground">{$t('profile.contact.email')}</dt><dd>{guardian.email || $t('profile.notProvided')}</dd></div>
					<div class="min-w-0"><dt class="text-muted-foreground">{$t('profile.contact.phone')}</dt><dd>{guardian.phone || $t('profile.notProvided')}</dd></div>
					<div class="min-w-0"><dt class="text-muted-foreground">{$t('profile.occupation')}</dt><dd>{guardian.occupation || $t('profile.notProvided')}</dd></div>
				</dl>
			</div>
		{/snippet}
	</ListEntityCards>
</StudentProfileSectionQuery>
