import type { PageQueryRequest } from './student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ApiError } from '@maya-invest/edaya-api-client';
import { resolveStudentPageLoad } from './student-page-status';

interface Selection { studentId: string; subject?: string }
interface HistoryPage { items: { id: string }[]; nextCursor: string | null }

export class StudentHistoryState<P extends HistoryPage> {
	page = $state.raw<P | null>(null);
	selection = $state.raw<Selection | null>(null);
	loadingMore = $state(false);
	moreError = $state<'error' | 'denied' | null>(null);
	private controller?: AbortController;
	private generation = -1;
	private requestVersion = 0;

	constructor(
		private readonly read: (selection: Selection, cursor: string | undefined, signal: AbortSignal) => Promise<P>,
		private readonly subjectFromUrl?: (url: URL) => string | undefined,
	) {}

	cancelMore() {
		this.controller?.abort();
		this.controller = undefined;
		this.loadingMore = false;
	}

	clear() {
		this.requestVersion++;
		this.cancelMore();
		this.selection = null;
		this.page = null;
		this.moreError = null;
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				this.clear();
				const studentId = studentDetailIdFromPathname(url.pathname);
				if (!studentId)
					return {};
				const selection = { studentId, subject: this.subjectFromUrl?.(url) };
				const generation = academicContext.scopeGeneration;
				const version = this.requestVersion;
				const page = await this.read(selection, undefined, signal);
				signal.throwIfAborted();
				if (version === this.requestVersion && academicContext.scopeGeneration === generation) {
					this.selection = selection;
					this.generation = generation;
					this.page = page;
				}
				return {};
			},
			hasItems: () => true,
		}, request);
	}

	async loadMore() {
		const previous = this.page;
		const selection = this.selection;
		if (!previous?.nextCursor || !selection || this.loadingMore || this.generation !== academicContext.scopeGeneration)
			return;
		const controller = new AbortController();
		this.controller = controller;
		this.loadingMore = true;
		this.moreError = null;
		try {
			const page = await this.read(selection, previous.nextCursor, controller.signal);
			if (controller.signal.aborted || previous !== this.page || this.generation !== academicContext.scopeGeneration)
				return;
			this.page = { ...page, items: mergeById(previous.items, page.items) };
		}
		catch (error) {
			if (controller.signal.aborted || previous !== this.page || this.generation !== academicContext.scopeGeneration)
				return;
			if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
				this.clear();
				this.moreError = 'denied';
			}
			else {
				this.moreError = 'error';
			}
		}
		finally {
			if (controller === this.controller) {
				this.controller = undefined;
				this.loadingMore = false;
			}
		}
	}
}
