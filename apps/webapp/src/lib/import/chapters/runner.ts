import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { ValidatedChapterImportRow } from './types';
import {
	createChapterImportMatterId,
	saveChapterForClassSubject,
} from '$lib/chapters/save-chapter-for-class-subject';
import { t } from '$lib/i18n';
import { formatImportRunErrorMessage } from '$lib/import/shared/format-import-run-error';
import { notifySubjectsListChanged } from '$lib/subjects/notify-subjects-list-changed';
import { get } from 'svelte/store';
import { countChapterImportOperations } from './validator';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface ChapterImportRunFailure {
	rowIndex: number;
	chapterLabel: string;
	message: string;
}

export interface ChapterImportRunResult {
	created: number;
	failed: ChapterImportRunFailure[];
	matterIds: string[];
}

export interface ChapterImportRunOptions {
	client: SchoolClient;
	rows: readonly ValidatedChapterImportRow[];
	onProgress?: (current: number, total: number) => void;
	seed?: string;
}

export async function runChapterImport(options: ChapterImportRunOptions): Promise<ChapterImportRunResult> {
	const { client, rows, onProgress, seed = Date.now().toString(36) } = options;
	const failed: ChapterImportRunFailure[] = [];
	const matterIds: string[] = [];
	const createdAt = new Date().toISOString();
	const total = countChapterImportOperations(rows);
	let progress = 0;

	for (const [rowIndex, row] of rows.entries()) {
		for (const [targetIndex, target] of row.targets.entries()) {
			onProgress?.(progress, total);
			const matterId = createChapterImportMatterId(
				rowIndex * 100 + targetIndex,
				target.classSubjectId,
				seed,
			);

			try {
				await saveChapterForClassSubject(client, {
					matterId,
					subjectId: target.subjectId,
					classSubjectId: target.classSubjectId,
					classGroupId: target.classGroupId,
					gradeLevelSubjectId: target.gradeLevelSubjectId,
					name: row.titre,
					description: row.description,
					sequenceOrder: row.sequenceOrder,
					createdAt,
				});
				matterIds.push(matterId);
			}
			catch (error) {
				failed.push({
					rowIndex: row.rowIndex,
					chapterLabel: `${row.titre} (${target.className} · ${row.matiere})`.trim(),
					message: formatImportRunErrorMessage(error, {
						entityLabel: row.titre,
					}, (key, params) => get(t)(key, params ?? {})),
				});
			}

			progress += 1;
		}
	}

	onProgress?.(total, total);

	const result = {
		created: matterIds.length,
		failed,
		matterIds,
	};

	if (matterIds.length > 0) {
		try {
			notifySubjectsListChanged();
		}
		catch {
			// Import succeeded; roster notification is best-effort.
		}
	}

	return result;
}
