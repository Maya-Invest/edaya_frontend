import type { components } from '$lib/api/schema';
import { detailHref } from '$lib/detail-hrefs';
import { TASK_QUERY_KEYS, writeModalSurface } from '$lib/modal/modal-url';
import { detailNavigationSearch } from '$lib/navigation/detail-navigation';

export type MarksReview = components['schemas']['AssessmentMarksReviewResponse'];
export interface GradeEntryPolicy { gradingPolicy?: MarksReview['gradingPolicy']; assessment: Pick<MarksReview['assessment'], 'maxScore'> }
export type GradeResult = components['schemas']['AssessmentResult'];
export interface GradeDraft { score: string; mentionId: string; designation: 'scored' | 'absent' | 'exempt' }
export type GradeSaveOutcome = { saved: false } | { saved: true; result: GradeResult; review: MarksReview | null };

export function gradingTaskHref(url: URL, classId: string, assessmentId: string, panel: 'entry' | 'correction'): string {
	const detail = new URL(`${detailHref.classEvaluationTab(classId, assessmentId, 'grading')}${detailNavigationSearch(url)}`, url);
	return writeModalSurface(detail, { modal: 'grade-entry', target: assessmentId, tab: panel }, TASK_QUERY_KEYS);
}

export function gradeDraft(result?: GradeResult): GradeDraft {
	return { score: String(result?.originalEntry?.kind === 'numeric' ? result.originalEntry.value : result?.score ?? ''), mentionId: result?.mentionId ?? '', designation: result?.designation ?? 'scored' };
}

/** Strict decimal parsing: a malformed draft must never become a different valid mark. */
export function gradeValues(draft: GradeDraft, review: GradeEntryPolicy) {
	if (!review.gradingPolicy || review.gradingPolicy.status !== 'completed')
		return null;
	if (draft.designation === 'absent' || draft.designation === 'exempt')
		return { designation: draft.designation, score: null, mentionId: null };
	if (draft.designation !== 'scored')
		return null;
	if (review.gradingPolicy.mode === 'mention-first') {
		return draft.mentionId && review.gradingPolicy.scale.ranges.some(row => row.id === draft.mentionId)
			? { designation: draft.designation, score: null, mentionId: draft.mentionId }
			: null;
	}
	const text = draft.score.trim();
	if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text))
		return null;
	const score = Number(text.replace(',', '.'));
	return Number.isFinite(score) && score >= 0 && score <= review.assessment.maxScore
		? { designation: draft.designation, score, mentionId: null }
		: null;
}

export function gradeEditable(review: MarksReview, studentId: string): boolean {
	const result = review.results.find(row => row.studentId === studentId);
	return review.assessment.marksStatus === 'draft' && review.gradingPolicy?.status === 'completed'
		&& review.students.some(row => row.id === studentId)
		&& (!result || !review.publishedResultIds.includes(result.id));
}

/** A correction targets one persisted, authorized result; never the first visible row. */
export function gradeCorrectable(review: MarksReview, resultId: string): boolean {
	const result = review.results.find(row => row.id === resultId);
	return Boolean(result && result.assessmentId === review.assessment.id
		&& review.students.some(row => row.id === result.studentId)
		&& review.allowedActions.requestCorrection && review.assessment.marksStatus === 'submitted'
		&& review.gradingPolicy?.status === 'completed'
		&& !review.publishedResultIds.includes(resultId)
		&& !review.corrections.some(row => row.status === 'pending'));
}

/** A refresh can advance the next save's revision only when the rest of the captured context is unchanged. */
export function continuesGradeContext(before: MarksReview, after: MarksReview, saved: GradeResult): boolean {
	const context = (review: MarksReview) => JSON.stringify({
		assessment: { ...review.assessment, marksRevision: undefined, marksReview: undefined },
		policy: review.gradingPolicy,
		students: review.students.map(row => row.id).sort(),
		results: review.results.filter(row => row.studentId !== saved.studentId).sort((a, b) => a.id.localeCompare(b.id)),
		published: [...review.publishedResultIds].sort(),
		corrections: review.corrections,
	});
	// The existing single-result command advances the marks sheet exactly once.
	// A larger revision jump must not silently rebase the remaining captured drafts.
	return after.assessment.marksRevision === before.assessment.marksRevision + 1 && context(before) === context(after)
		&& after.results.some(row => row.id === saved.id && row.revision === saved.revision
			&& row.score === saved.score && row.mentionId === saved.mentionId && row.designation === saved.designation);
}

/** Per-record commands, sequential revisions, no inferred batch/atomicity and no replay of confirmed rows. */
export async function saveGradeDraft(input: {
	review: MarksReview;
	drafts: Record<string, GradeDraft>;
	baseline: Record<string, GradeDraft>;
	canContinue: () => boolean;
	save: (review: MarksReview, studentId: string, draft: GradeDraft) => Promise<GradeSaveOutcome>;
	onSaved: (studentId: string, draft: GradeDraft) => void;
}) {
	let review = input.review;
	const changed = review.students.filter(row => gradeEditable(review, row.id) && JSON.stringify(input.drafts[row.id]) !== JSON.stringify(input.baseline[row.id]));
	const progress = { saved: [] as string[], failed: [] as string[], remaining: changed.map(row => row.id), interrupted: false, refreshFailed: false, review, verification: null as { review: MarksReview; result: GradeResult } | null };
	for (const student of changed) {
		if (!input.canContinue()) {
			progress.interrupted = true;
			break;
		}
		const draft = input.drafts[student.id];
		if (!draft || !gradeValues(draft, review)) {
			progress.failed.push(student.id);
			break;
		}
		const outcome = await input.save(review, student.id, draft);
		if (!outcome.saved) {
			progress.failed.push(student.id);
			break;
		}
		progress.saved.push(student.id);
		progress.remaining = progress.remaining.filter(id => id !== student.id);
		input.onSaved(student.id, draft);
		if (!outcome.review) {
			progress.refreshFailed = true;
			progress.verification = { review, result: outcome.result };
			break;
		}
		if (!continuesGradeContext(review, outcome.review, outcome.result)) {
			progress.interrupted = true;
			break;
		}
		review = outcome.review;
		progress.review = review;
	}
	return progress;
}
