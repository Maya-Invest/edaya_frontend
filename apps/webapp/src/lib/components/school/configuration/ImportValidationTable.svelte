<script lang="ts">
	import type { StudentImportColumnKey, StudentImportValidationIssue } from '$lib/import/students/types';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	const COLUMN_LABEL_KEYS: Record<StudentImportColumnKey, string> = {
		prenom: 'import.students.columns.prenom',
		nom: 'import.students.columns.nom',
		classe: 'import.students.columns.classe',
		date_naissance: 'import.students.columns.date_naissance',
		genre: 'import.students.columns.genre',
		matricule: 'import.students.columns.matricule',
	};

	const {
		issues,
	}: {
		issues: readonly StudentImportValidationIssue[];
	} = $props();

	function formatIssueMessage(issue: StudentImportValidationIssue): string {
		let message = get(t)(issue.messageKey, issue.messageParams ?? {});
		if (issue.suggestions?.length) {
			message = `${message} ${get(t)('import.students.validation.suggestions', { values: issue.suggestions.join(', ') })}`;
		}
		return message;
	}
</script>

{#if issues.length > 0}
	<div class="overflow-hidden rounded-xl border border-border" data-testid="import-validation-table">
		<div class="scrollbar-thin max-h-[min(40vh,20rem)] overflow-auto">
			<table class="w-full min-w-[40rem] text-left text-sm">
				<thead class="sticky top-0 z-10 bg-secondary/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
					<tr>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.row')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.column')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.value')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.message')}</th>
					</tr>
				</thead>
				<tbody>
					{#each issues as issue (issue.rowIndex + (issue.column ?? '') + issue.messageKey)}
						<tr class="border-t border-border align-top">
							<td class="px-3 py-2 font-mono text-xs">{issue.rowIndex}</td>
							<td class="px-3 py-2">
								{issue.column ? $t(COLUMN_LABEL_KEYS[issue.column]) : '—'}
							</td>
							<td class="px-3 py-2 text-muted-foreground">{issue.value ?? '—'}</td>
							<td class="px-3 py-2">{formatIssueMessage(issue)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
