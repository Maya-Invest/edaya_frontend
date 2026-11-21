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
		const school = hasPermission('SCHOOL_MESSAGES_READ');
		const oversight = hasPermission('TEACHER_MESSAGES_REVIEW');
		return authSession.ready && authSession.isLoggedIn && authSession.sessionKind === 'staff' && (school || oversight)
			? `${authSession.subjectId}|${authSession.schoolId}|${authSession.userId}|${school}|${oversight}`
			: '';
	}

	get count() {
		return this.scope && this.loadedScope === this.scope ? this.value : null;
	}

	async refresh(signal?: AbortSignal) {
		const scope = this.scope;
		if (!scope || this.pending)
			return;
		const generation = this.generation;
		this.pending = true;
		try {
			const client = getBrowserSchoolClient();
			const { count } = await client.queries.getUnresolvedConversationCount({}, { signal });
			if (generation === this.generation && scope === this.scope) {
				this.value = count;
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
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;
		let interval = 15_000;
		const poll = async () => {
			if (document.hidden || controller.signal.aborted)
				return;
			const previous = this.count;
			await this.refresh(controller.signal);
			if (controller.signal.aborted || document.hidden)
				return;
			interval = previous !== null && this.count === previous ? Math.min(interval * 2, 60_000) : 15_000;
			timer = setTimeout(poll, interval);
		};
		const onVisibility = () => {
			clearTimeout(timer);
			interval = 15_000;
			if (!document.hidden && !this.pending)
				void poll();
		};
		void poll();
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			controller.abort();
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisibility);
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
