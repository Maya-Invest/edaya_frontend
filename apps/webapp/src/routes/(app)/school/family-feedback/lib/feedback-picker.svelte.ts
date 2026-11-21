import type { FeedbackOption, FeedbackPicker } from '$lib/api/family-feedback-types';
import type { FamilyFeedbackPageState } from '../family-feedback-page.svelte';

type Options = Pick<FamilyFeedbackPageState, 'firstOptions' | 'optionScope' | 'readOptions' | 'handleOptionsDenial'>;

export class FeedbackPickerState {
	query = $state('');
	status = $state<'ready' | 'loading' | 'error'>('ready');
	private result = $state<{ items: FeedbackOption[]; cursor: string | null }>();
	private retryAfter?: string;
	private request?: AbortController;
	private timer?: ReturnType<typeof setTimeout>;

	constructor(private feedback: Options, private picker: () => FeedbackPicker) {}

	private get cursorKey() {
		return this.picker() === 'assignments' ? 'nextAssignment' : 'nextModerator';
	}

	get searchable() { return Boolean(this.feedback.firstOptions?.[this.cursorKey]); }
	get items() { return this.result?.items ?? this.feedback.firstOptions?.[this.picker()] ?? []; }
	get cursor() { return this.result ? this.result.cursor : this.feedback.firstOptions?.[this.cursorKey]; }

	cancel() {
		clearTimeout(this.timer);
		this.request?.abort();
	}

	search(text: string) {
		this.cancel();
		this.query = text;
		this.status = 'loading';
		this.timer = setTimeout(() => void this.fetchPage(), 200);
	}

	more() { return this.fetchPage(this.cursor ?? undefined); }
	retry() { return this.fetchPage(this.retryAfter); }

	private async fetchPage(after?: string) {
		this.cancel();
		const controller = new AbortController();
		this.request = controller;
		const scope = this.feedback.optionScope;
		const previous = after ? this.items : [];
		this.status = 'loading';
		this.retryAfter = after;
		try {
			const picker = this.picker();
			const page = await this.feedback.readOptions(picker, controller.signal, this.query.trim() || undefined, after);
			if (controller.signal.aborted || scope !== this.feedback.optionScope)
return;
			this.result = { items: [...previous, ...page[picker]], cursor: page[this.cursorKey] };
			this.status = 'ready';
		}
		catch (error) {
			if (!controller.signal.aborted && scope === this.feedback.optionScope && !this.feedback.handleOptionsDenial(error))
				this.status = 'error';
		}
	}
}
