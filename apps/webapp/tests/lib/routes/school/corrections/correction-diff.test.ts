import { describe, expect, test } from 'bun:test';
import { correctionDiff, correctionRevisionDiff } from '../../../../../src/routes/(app)/school/corrections/correction-diff';
import type { CorrectionDetail } from '../../../../../src/routes/(app)/school/corrections/corrections-page.svelte';

const t = (key: string) => key;
function detail(correction: unknown): CorrectionDetail {
  return { correction, context: { className: 'CM1', teacherName: 'Ada', students: [{ id: 'student', name: 'Grace' }] }, original: { fieldNames: { chapter: 'Fractions', removed: 'Addition', subject: 'Mathematics' } }, history: [], allowedActions: { approve: true, reject: true, withdraw: false } } as CorrectionDetail;
}
describe('typed correction comparison', () => {
  test('shows changed homework deadline and comment with the student name', () => {
    const rows = correctionDiff(detail({ workflow: 'grades', changes: [{ studentId: 'student', before: { score: 15, designation: 'scored', notes: 'Old', status: 'missed' }, proposed: { score: 15, designation: 'scored', notes: 'New', status: 'met' } }] }), t);
    expect(rows).toEqual([{ label: 'Grace · corrections.field.status', before: 'corrections.value.missed', proposed: 'corrections.value.met' }, { label: 'Grace · corrections.field.notes', before: 'Old', proposed: 'New' }]);
  });
  test('unwraps structured logbooks, compares objectives and catches removed progress', () => {
    const rows = correctionDiff(detail({ workflow: 'logbook', before: { workflow: 'logbook', sessionNote: JSON.stringify({ edayaLogbook: { content: 'Lesson', objectives: ['Add'], homework: 'Exercise 1' } }), progress: [{ matterId: 'chapter', completedPercentage: 80 }, { matterId: 'removed', completedPercentage: 10 }] }, proposal: { workflow: 'logbook', sessionNote: JSON.stringify({ edayaLogbook: { content: 'Lesson', objectives: ['Divide'], homework: 'Exercise 1' } }), progress: [{ matterId: 'chapter', completedPercentage: 40 }] } }), t);
    expect(rows).toEqual([{ label: 'corrections.field.objectives', before: 'Add', proposed: 'Divide' }, { label: 'Fractions', before: '80%', proposed: '40%' }, { label: 'Addition', before: '10%', proposed: '—' }]);
  });
  test('uses report subject labels and preserves unchanged fields', () => {
    expect(correctionDiff(detail({ workflow: 'report_comments', before: { workflow: 'report_comments', sections: [{ sectionId: 'subject', comment: 'Original' }] }, proposal: { workflow: 'report_comments', sections: [{ sectionId: 'subject', comment: 'Corrected' }] } }), t)).toEqual([{ label: 'Mathematics', before: 'Original', proposed: 'Corrected' }]);
  });
});


test('shows mention-only changes and historical proposals using readable codes', () => {
  const change = { studentId: 'student', before: { mentionId: 'b', score: null, designation: 'scored', notes: null }, proposed: { mentionId: 'a', score: null, designation: 'scored', notes: null } };
  const input = detail({ workflow: 'grades', changes: [change], revisions: [{ version: 0, changes: [change] }] });
  input.original = { mentionLabels: { a: 'A · Excellent', b: 'B · Good' } };
  const expected = [{ label: 'Grace · corrections.field.mentionId', before: 'B · Good', proposed: 'A · Excellent' }];
  expect(correctionDiff(input, t)).toEqual(expected);
  expect(correctionRevisionDiff(input, 0, t)).toEqual(expected);
});

test('null and omitted mention IDs do not create a false change on numeric corrections', () => {
  const input = detail({ workflow: 'grades', changes: [{ studentId: 'student', before: { score: 12.345, designation: 'scored', notes: null }, proposed: { mentionId: null, score: 13.456, designation: 'scored', notes: null } }] });
  expect(correctionDiff(input, t)).toEqual([{ label: 'Grace · corrections.field.score', before: '12.345', proposed: '13.456' }]);
});
