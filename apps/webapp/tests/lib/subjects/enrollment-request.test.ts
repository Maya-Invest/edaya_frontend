import type { components } from '$lib/api/schema';
import { describe, expect, it } from 'bun:test';
import { mutationErrorMessage } from '$lib/api/mutations/execute-mutation';
import { EnrollmentRequest } from '$lib/subjects/enrollment-request';
import { ApiError } from '@maya-invest/edaya-api-client';

type Command = components['schemas']['ManageStudentSubjectEnrollmentsCommand'];
function command(requestId: string, _id: string, revision = 2): Command {
	return { requestId, expectedRevisions: { music: revision }, operations: [{ classSubjectId: 'music', studentClassEnrollmentId: 'placement', selection: { scope: 'annual' } }] };
}
describe('subject enrollment drafts', () => {
	it('reuses the request and row identity after a lost response but changes identity after a roster refresh', () => {
		const draft = new EnrollmentRequest();
		const first = draft.prepare(command('first', 'choice'));
		expect(draft.prepare(command('retry', 'new-id'))).toBe(first);
		expect(draft.prepare(command('refreshed', 'choice-2', 3)).requestId).toBe('refreshed');
		draft.complete();
		expect(draft.prepare(command('next', 'choice-3', 3)).requestId).toBe('next');
	});
	it('shows the affected history record identifiers', () => {
		const error = new ApiError(409, { code: 'SUBJECT_ENROLLMENT_HISTORY_CONFLICT', message: 'Saved history prevents this change', details: { conflicts: [{ kind: 'lesson', id: 'lesson-42' }, { kind: 'report', id: 'report-7' }] } });
		const message = mutationErrorMessage(error, undefined, key => key);
		expect(message).toContain('Saved history prevents this change');
		expect(message).toContain('lesson-42');
		expect(message).toContain('report-7');
	});
});
