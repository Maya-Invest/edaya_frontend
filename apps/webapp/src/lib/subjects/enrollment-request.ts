import type { components } from '$lib/api/schema';

type Command = components['schemas']['ManageStudentSubjectEnrollmentsCommand'];

/** Retain replay identity after a lost response; an edited draft becomes a new request. */
export class EnrollmentRequest {
	private key = '';
	private pending: Command | undefined;

	prepare(input: Command): Command {
		const key = JSON.stringify({ expectedRevisions: input.expectedRevisions, operations: input.operations });
		if (this.pending && key === this.key)
			return this.pending;
		this.key = key;
		this.pending = input;
		return input;
	}

	complete() {
		this.pending = undefined;
	}
}

export function isParticipationConflict(error: unknown): boolean {
	return typeof error === 'object' && error !== null && 'body' in error
		&& (error.body as { code?: string } | undefined)?.code === 'SUBJECT_PARTICIPATION_REVISION_CONFLICT';
}
