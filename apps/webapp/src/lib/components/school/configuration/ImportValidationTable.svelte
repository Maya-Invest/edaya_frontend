<script lang="ts">
	import { t } from '$lib/i18n';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	export type ImportValidationSeverity = 'error' | 'warning';

	export interface ImportValidationIssueView {
		rowIndex: number;
		column?: string;
		value?: string;
		messageKey: string;
		messageParams?: Record<string, string | number>;
		suggestions?: string[];
		severity?: ImportValidationSeverity;
	}

	const {
		issues,
		columnLabelKeys,
		suggestionsKey = 'import.students.validation.suggestions',
	}: {
		issues: readonly ImportValidationIssueView[];
		columnLabelKeys: Record<string, string>;
		suggestionsKey?: string;
	} = $props();

	function formatIssueMessage(issue: ImportValidationIssueView): string {
		let message = get(t)(issue.messageKey, issue.messageParams ?? {});
		if (issue.suggestions?.length) {
			message = `${message} ${get(t)(suggestionsKey, { values: issue.suggestions.join(', ') })}`;
		}
		return message;
	}

	function issueSeverity(issue: ImportValidationIssueView): ImportValidationSeverity {
		return issue.severity ?? 'error';
	}

	function severityBadgeClass(severity: ImportValidationSeverity): string {
		if (severity === 'warning') {
			return 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100';
		}
		return 'border-destructive/30 bg-destructive/10 text-destructive';
	}

	function rowClass(severity: ImportValidationSeverity): string {
		if (severity === 'warning') {
			return 'bg-amber-500/[0.06]';
		}
		return 'bg-destructive/[0.06]';
	}

	function messageClass(severity: ImportValidationSeverity): string {
		if (severity === 'warning') {
			return 'text-amber-950 dark:text-amber-50';
		}
		return 'text-destructive';
	}
</script>

{#if issues.length > 0}
	<div class="overflow-hidden rounded-xl border border-border" data-testid="import-validation-table">
		<div class="scrollbar-thin max-h-[min(40vh,20rem)] overflow-auto">
			<table class="w-full min-w-[40rem] text-left text-sm">
				<thead class="sticky top-0 z-10 bg-secondary/95 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
					<tr>
						<th class="px-3 py-2 font-medium">{$t('import.validation.table.severity')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.row')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.column')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.value')}</th>
						<th class="px-3 py-2 font-medium">{$t('import.students.validation.table.message')}</th>
					</tr>
				</thead>
				<tbody>
					{#each issues as issue, index (`import-validation-issue-${index}`)}
						{@const severity = issueSeverity(issue)}
						<tr class={cn('border-t border-border align-top', rowClass(severity))}>
							<td class="px-3 py-2">
								<span
									class={cn(
										'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
										severityBadgeClass(severity),
									)}
								>
									{severity === 'warning'
										? $t('import.validation.severity.warning')
										: $t('import.validation.severity.error')}
								</span>
							</td>
							<td class="px-3 py-2 font-mono text-xs">{issue.rowIndex}</td>
							<td class="px-3 py-2">
								{issue.column && columnLabelKeys[issue.column]
									? $t(columnLabelKeys[issue.column])
									: '—'}
							</td>
							<td class="px-3 py-2 text-muted-foreground">{issue.value ?? '—'}</td>
							<td class={cn('px-3 py-2', messageClass(severity))}>{formatIssueMessage(issue)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
