import { expect, test } from 'bun:test';
import { marksReview } from '../../../../fixtures/grading/data';
import { continuesGradeContext, gradeCorrectable, gradeDraft, gradeEditable, gradeValues, gradingTaskHref, saveGradeDraft } from '../../../../../src/routes/(app)/classes/[classId]/evaluations/lib/grading-task';

test('numeric entry is strict, preserves zero, comma decimals and absent/exempt meanings', () => {
	const review = marksReview();
	for (const text of ['', '3oops', '0x10', 'Infinity', '-1', '21']) expect(gradeValues({ score: text, mentionId: '', designation: 'scored' }, review)).toBeNull();
	for (const [text, score] of [['0', 0], ['12,5', 12.5], ['.5', .5]] as const) expect(gradeValues({ score: text, mentionId: '', designation: 'scored' }, review)?.score).toBe(score);
	expect(gradeValues({ score: 'bad', mentionId: '', designation: 'exempt' }, review)).toEqual({ designation: 'exempt', score: null, mentionId: null });
});
test('only captured policy mentions are accepted; unavailable/updating policies cannot write', () => {
	const review = marksReview(); review.gradingPolicy!.mode = 'mention-first';
	expect(gradeValues({ score: '', mentionId: 'other', designation: 'scored' }, review)).toBeNull();
	expect(gradeValues({ score: '', mentionId: 'pass', designation: 'scored' }, review)?.mentionId).toBe('pass');
	review.gradingPolicy!.status = 'updating';
	expect(gradeValues({ score: '', mentionId: 'pass', designation: 'scored' }, review)).toBeNull();
});
test('roster, submitted marks and published results bound entry eligibility', () => {
	const review = marksReview();
	expect(gradeEditable(review, 'other')).toBe(false);
	review.publishedResultIds = ['existing-id'];
	expect(gradeEditable(review, 's1')).toBe(false);
	expect(gradeEditable(review, 's2')).toBe(true);
	review.assessment.marksStatus = 'submitted';
	expect(gradeEditable(review, 's2')).toBe(false);
});
test('task addresses preserve collection context and remove legacy mutation targets', () => {
	const href = gradingTaskHref(new URL('https://school.test/classes/class/evaluations/assessment/grading?q=math&view=list&modal=request-correction&modalTarget=old'), 'class', 'assessment', 'correction');
	const url = new URL(href, 'https://school.test');
	expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'math', view: 'list', task: 'grade-entry', taskTarget: 'assessment', taskPanel: 'correction' });
});
test('partial entry advances server revisions and retries only unsaved rows', async () => {
	const review = marksReview();
	const baseline = Object.fromEntries(review.students.map(row => [row.id, gradeDraft(review.results.find(result => result.studentId === row.id))]));
	const drafts = Object.fromEntries(review.students.map(row => [row.id, { score: '15', mentionId: '', designation: 'scored' as const }]));
	const revisions: number[] = [];
	const progress = await saveGradeDraft({ review, drafts, baseline, canContinue: () => true,
		save: async (snapshot, studentId) => {
			revisions.push(snapshot.assessment.marksRevision);
			if (studentId === 's2') return { saved: false };
			const next = structuredClone(snapshot); next.assessment.marksRevision = 4;
			const result = { ...next.results[0]!, score: 15, revision: 2 }; next.results = [result];
			return { saved: true, result, review: next };
		}, onSaved: (id, draft) => { baseline[id] = draft; },
	});
	expect(revisions).toEqual([3, 4]);
	expect(progress.saved).toEqual(['s1']); expect(progress.failed).toEqual(['s2']); expect(progress.remaining).toEqual(['s2']);
	const retried: string[] = [];
	await saveGradeDraft({ review: progress.review, drafts, baseline, canContinue: () => true, save: async (_, id) => { retried.push(id); return { saved: false }; }, onSaved: () => {} });
	expect(retried).toEqual(['s2']);
});
test('confirmed write with failed refresh stays saved and stops subsequent writes', async () => {
	const review = marksReview(); const drafts = { s1: { score: '15', mentionId: '', designation: 'scored' as const }, s2: { score: '16', mentionId: '', designation: 'scored' as const } };
	const acknowledged: string[] = [];
	const result = await saveGradeDraft({ review, drafts, baseline: {}, canContinue: () => true, save: async () => ({ saved: true, result: review.results[0]!, review: null }), onSaved: id => { acknowledged.push(id); } });
	expect(result.verification?.review.assessment.marksRevision).toBe(3); expect(acknowledged).toEqual(['s1']); expect(result.refreshFailed).toBe(true); expect(result.remaining).toEqual(['s2']);
});
test('concurrent policy, roster, other result or publication changes stop revision adoption', () => {
	const before = marksReview();
	for (const change of [(r: typeof before) => r.assessment.marksRevision++, (r: typeof before) => r.gradingPolicy!.revision++, (r: typeof before) => r.students.pop(), (r: typeof before) => r.publishedResultIds.push('existing-id'), (r: typeof before) => r.results.push({ ...r.results[0]!, id: 'other', studentId: 's2' })]) {
		const after = structuredClone(before); after.assessment.marksRevision++; change(after);
		expect(continuesGradeContext(before, after, before.results[0]!)).toBe(false);
	}
});
test('leaving or losing authority stops unsent records', async () => {
	const review = marksReview(); let active = true; const calls: string[] = [];
	const draft = { score: '15', mentionId: '', designation: 'scored' as const };
	const outcome = await saveGradeDraft({ review, drafts: { s1: draft, s2: draft }, baseline: {}, canContinue: () => active,
		save: async (snapshot, id) => { calls.push(id); active = false; const next = structuredClone(snapshot); next.assessment.marksRevision++; return { saved: true, result: snapshot.results[0]!, review: next }; }, onSaved: () => {},
	});
	expect(calls).toEqual(['s1']); expect(outcome.interrupted).toBe(true); expect(outcome.remaining).toEqual(['s2']);
});

test('individual corrections require the exact authorized submitted result and no published lock', () => {
 const review = marksReview(); review.assessment.marksStatus = 'submitted'; review.allowedActions.requestCorrection = true;
 expect(gradeCorrectable(review, 'existing-id')).toBe(true);
 expect(gradeCorrectable(review, 's1')).toBe(false);
 expect(gradeCorrectable(review, 'missing')).toBe(false);
 for (const mutate of [
  (r: typeof review) => { r.allowedActions.requestCorrection = false; },
  (r: typeof review) => { r.assessment.marksStatus = 'draft'; },
  (r: typeof review) => { r.gradingPolicy!.status = 'updating'; },
  (r: typeof review) => { r.publishedResultIds.push('existing-id'); },
  (r: typeof review) => { r.students = []; },
  (r: typeof review) => { r.results[0]!.assessmentId = 'another'; },
 ]) { const changed = structuredClone(review); mutate(changed); expect(gradeCorrectable(changed, 'existing-id')).toBe(false); }
});
