import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { resolvePageLoad } from '$lib/queries/page-status';
import { toast } from '$lib/toast.svelte';
import { SvelteSet } from 'svelte/reactivity';

export type CorrectionItem = components['schemas']['TeacherCorrectionsResponse']['items'][number];
export type CorrectionDetail = components['schemas']['TeacherCorrectionDetailResponse'];
export class CorrectionsPageState {
	items = $state<CorrectionItem[]>([]);
	detail = $state<CorrectionDetail | null>(null);
	filters = $state<components['schemas']['TeacherCorrectionsResponse']['filters']>({ classes: [], teachers: [], students: [] });
	total = $state(0);
	listLoading = $state(false);
	loadingMore = $state(false);
	loadMoreError = $state(false);
	private offset = $state(0);
	private listKey: string | null = null;
	private listInput: Omit<components['schemas']['ListTeacherCorrectionsQuery'], 'offset' | 'limit'> | null = null;
	private listGeneration = 0;
	get hasMore() {
		return this.offset < this.total && !this.loadMoreError;
	}

	async loadMore() {
		if (this.listLoading || this.loadingMore || !this.hasMore || !this.listInput)
			return;
		const generation = this.listGeneration;
		const scope = academicContext.scopeGeneration;
		this.loadingMore = true;
		try {
			const response = await getBrowserSchoolClient().queries.listTeacherCorrections({ ...this.listInput, offset: this.offset, limit: this.limit });
			if (generation !== this.listGeneration || scope !== academicContext.scopeGeneration)
				return;
			const seen = new SvelteSet(this.items.map(item => item.id));
			this.items = [...this.items, ...response.items.filter(item => !seen.has(item.id))];
			this.offset += response.items.length;
			this.total = response.total;
			if (response.items.length === 0)
				this.offset = response.total;
		}
		catch {
			if (generation === this.listGeneration && scope === academicContext.scopeGeneration) {
				this.loadMoreError = true;
				toast.error('Impossible de charger les corrections.');
			}
		}
		finally {
			if (generation === this.listGeneration)
				this.loadingMore = false;
		}
	}

	readonly limit = 25;
	async retryDocument(issuanceId: string): Promise<boolean> {
		return await runRouteMutation({ request: () => getBrowserSchoolClient().commands.retryDocumentIssuance({ requestId: crypto.randomUUID(), issuanceId }), versionKeys: ['documents', 'reportCards'] }) !== null;
	}

	async decide(decision: 'approve' | 'reject', reason: string, confirmed: boolean, translate: (key: string) => string): Promise<boolean> {
		const detail = this.detail;
		if (!detail)
return false;
		const previous = this.items;
		const total = this.total;
		const result = await runRouteMutation({
			request: async () => {
				const commands = getBrowserSchoolClient().commands;
				const input = { requestId: crypto.randomUUID(), correctionId: detail.correction.id, expectedVersion: detail.correction.version };
				if (detail.correction.workflow === 'grades') {
					if (decision === 'approve')
await commands.approveAssessmentMarksCorrection(input);
					else await commands.rejectAssessmentMarksCorrection({ ...input, reason: reason.trim() });
				}
 else {
					if (decision === 'approve')
await commands.approveTeacherCorrection({ ...input, confirmConsequences: confirmed });
					else await commands.rejectTeacherCorrection({ ...input, reason: reason.trim(), confirmConsequences: false });
				}
				return true;
			},
			apply: () => {
 this.items = this.items.filter(item => item.id !== detail.correction.id);
				this.total = Math.max(0, total - 1);
},
			rollback: () => {
 this.items = previous;
				this.total = total;
},
			versionKeys: ['evaluations', 'attendance', 'reportCards', 'planning', 'subjects', 'incidents', 'documents', 'inbox'],
			successMessage: translate(`marks.${decision === 'approve' ? 'approved' : 'rejected'}`),
		});
		return result !== null;
	}

	query = (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
		empty: () => ({}),
		load: async (signal) => {
			const client = getBrowserSchoolClient();
			const workflow = url.searchParams.get('workflow') || undefined;
			const correctionId = url.searchParams.get('correction');
			const input = {
				workflow: workflow as components['schemas']['ListTeacherCorrectionsQuery']['workflow'],
				status: (url.searchParams.get('status') || 'pending') as components['schemas']['ListTeacherCorrectionsQuery']['status'],
				classGroupId: url.searchParams.get('classGroupId') || undefined,
				teacherSubjectId: url.searchParams.get('teacherSubjectId') || undefined,
				studentId: url.searchParams.get('studentId') || undefined,
				search: url.searchParams.get('search') || undefined,
				from: url.searchParams.get('from') ? `${url.searchParams.get('from')}T00:00:00.000Z` : undefined,
				to: url.searchParams.get('to') ? `${url.searchParams.get('to')}T23:59:59.999Z` : undefined,
				periodId: workflow === 'grades' || workflow === 'report_comments' ? academicContext.periodId || undefined : undefined,
			};
			const key = JSON.stringify([academicContext.scopeGeneration, input, url.searchParams.get('refresh')]);
			const reload = key !== this.listKey;
			if (reload) {
				this.listGeneration += 1;
				this.listLoading = true;
				this.listKey = null;
				this.listInput = null;
				this.loadingMore = false;
				this.loadMoreError = false;
				this.offset = 0;
				this.items = [];
				this.total = 0;
			}
			const generation = this.listGeneration;
			try {
				const [response, detail] = await Promise.all([
					reload ? client.queries.listTeacherCorrections({ ...input, offset: 0, limit: this.limit }) : Promise.resolve(null),
					correctionId ? client.queries.getTeacherCorrection({ correctionId }) : Promise.resolve(null),
				]);
				signal.throwIfAborted();
				if (response) {
					this.listKey = key;
					this.listInput = input;
					this.offset = response.items.length;
					this.items = response.items;
					this.filters = response.filters;
					this.total = response.total;
				}
				this.detail = detail;
				return {};
			}
			finally {
				if (generation === this.listGeneration)
					this.listLoading = false;
			}
		},
		hasItems: () => this.total > 0 || this.detail !== null,
		errorMessage: 'Impossible de charger les corrections.',
	}, request);
}
