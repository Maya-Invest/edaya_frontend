import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';

const contextKey = Symbol('message-count');

/** Unresolved totals across all authorized conversations, independent of the visible inbox filters. */
export class MessageCountState {
	private value = $state<number | null>(null);
	private loadedScope = $state('');
	private generation = 0;
	private pending = false;

	get scope() {
		return authSession.ready && authSession.isLoggedIn && authSession.sessionKind === 'staff' && (hasPermission('SCHOOL_MESSAGES_READ') || hasPermission('TEACHER_MESSAGES_REVIEW'))
			? `${authSession.subjectId}|${authSession.schoolId}|${authSession.userId}`
			: '';
	}

	get count() {
		return this.scope && this.loadedScope === this.scope ? this.value : null;
	}

	async refresh() {
		const scope = this.scope;
		if (!scope || this.pending)
			return;
		const generation = this.generation;
		this.pending = true;
		try {
			const client = getBrowserSchoolClient();
			const [school, guardian] = await Promise.all([
				client.queries.listConversations({ status: 'awaiting_school', order: 'latest', offset: 0, limit: 1 }),
				client.queries.listConversations({ status: 'awaiting_guardian', order: 'latest', offset: 0, limit: 1 }),
			]);
			if (generation === this.generation && scope === this.scope) {
				this.value = school.total + guardian.total;
				this.loadedScope = scope;
			}
		}
		catch {
			if (generation === this.generation && scope === this.scope)
				this.value = null;
		}
		finally {
			if (generation === this.generation)
				this.pending = false;
		}
	}

	start() {
		const refresh = () => {
			if (!document.hidden)
				void this.refresh();
		};
		refresh();
		const timer = setInterval(refresh, 15000);
		document.addEventListener('visibilitychange', refresh);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', refresh);
			this.generation++;
			this.pending = false;
		};
	}
}

export function provideMessageCount(state: MessageCountState) {
	setContext(contextKey, state);
}

export function getMessageCount() {
	return getContext<MessageCountState | undefined>(contextKey);
}
