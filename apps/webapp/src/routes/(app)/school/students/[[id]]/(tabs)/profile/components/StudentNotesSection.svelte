<script lang="ts">
	import type { Student } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { t, locale } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { hasPermission } from '$lib/permissions';
	import { getStudentProfileTabState, pedagogicalNoteToneByCategory, pedagogicalNoteCategoryKeys } from '../student-profile-tab.svelte';
	import StudentProfileSectionQuery from './StudentProfileSectionQuery.svelte';

	const { s }: { s: Student } = $props();
	const owner = getStudentProfileTabState();
	const modals = getDrawerUrlModals();
	const notes = $derived(owner.notesFor(s.id));
	const staff = $derived(owner.staffFor(s.id));
	const canManage = $derived(hasPermission('STUDENT_MANAGE', { classId: s.classId, studentId: s.id }));
</script>
<div class="ui-student-section-heading"><h3 id="student-notes-heading">{$t('student.pedagogicalNotes')}</h3>{#if canManage}<Button variant="outline" onclick={() => modals?.open('note')}>{$t('note.add')}</Button>{/if}</div>
<StudentProfileSectionQuery section="notes">
	{#if notes.length}<ul class="divide-y divide-border">{#each notes as note (note.id)}{@const author = staff.find(member => member.id === note.authorId)}<li class="space-y-3 py-4 first:pt-0 last:pb-0">
		<div class="flex flex-wrap items-center justify-between gap-3"><span class={`rounded px-2 py-1 text-xs ${pedagogicalNoteToneByCategory[note.category]}`}>{$t(`note.category.${pedagogicalNoteCategoryKeys[note.category]}`)}</span>{#if canManage}<Button variant="ghost" onclick={() => modals?.open('edit-note', { target: note.id })}>{$t('common.edit')}</Button>{/if}</div>
		{#if note.title}<h4 class="text-sm font-semibold">{note.title}</h4>{/if}<p class="whitespace-pre-wrap break-words text-sm">{note.content}</p>
		<p class="text-xs text-muted-foreground">{author?.name ?? $t(hasPermission('STAFF_READ') ? 'dataState.unavailable' : 'profile.restricted')} · {formatLocaleDate(note.date, $locale, { year: 'numeric', month: 'short', day: 'numeric' })} · {$t(`profile.noteVisibility.${note.visibility ?? 'staff'}`)}</p>
	</li>{/each}</ul>{:else}<p class="text-sm text-muted-foreground">{$t('student.noPedagogicalNotes')}</p>{/if}
</StudentProfileSectionQuery>
