import type { runMutation } from '$lib/api/mutations/run-mutation';
import type { components } from '$lib/api/schema';
import type { PageLoadState } from '$lib/page/load-state';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { t } from '$lib/i18n';
import { ApiError } from '@maya-invest/edaya-api-client';
import { SvelteMap } from 'svelte/reactivity';
import { get } from 'svelte/store';

type Batch = components['schemas']['SchoolImportBatch'];
type Detail = components['schemas']['SchoolImportDetail'];
type Download = components['schemas']['SchoolImportDownload'];
export type ImportMode = Batch['defaultOnExisting'];
export type DurableImportType = Detail['files'][number]['type'];
const IMPORT_VERSIONS = ['students', 'guardians', 'teachers', 'staff', 'subjects', 'planning', 'enrollments', 'billing', 'payments'] as const;

/** Owns transport and polling. Closing stops polling, never the persisted server batch. */
export class DataImportState {
	constructor(private readonly dependencies: { runMutation: typeof runMutation }) {}
	detail = $state<Detail | null>(null);
	history = $state<Batch[]>([]);
	busy = $state(false);
	loading = $state(false);
	error = $state('');
	historyError = $state('');
	mutationError = $state('');
	readStatus = $state<PageLoadState>('ready');
	savedRefreshFailed = $state(false);
	previewStale = $state(false);
	private scope = '';
	private generation = 0;
	private readGeneration = 0;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private activeId: string | null = null;
	private previousCounts = '';
	private get api() { return getBrowserSchoolClient().imports; }

	get canExecute() {
		return !this.busy && !this.error && !this.previewStale
			&& this.detail?.batch.state === 'validated'
			&& Boolean(this.detail.batch.previewDigest)
			&& this.detail.rows.some(row => row.outcome === 'pending');
	}

	disconnect() {
		this.generation++;
		this.readGeneration++;
		clearTimeout(this.timer);
		this.timer = undefined;
		this.loading = false;
	}

	clear() {
		this.disconnect();
		this.detail = null;
		this.history = [];
		this.error = '';
		this.historyError = '';
		this.mutationError = '';
		this.savedRefreshFailed = false;
		this.previewStale = false;
		this.readStatus = 'ready';
		this.activeId = null;
		this.previousCounts = '';
	}

	async connect(batchId: string | null, scope: string) {
		this.disconnect();
		if (scope !== this.scope) {
			this.clear();
			this.scope = scope;
		}
		this.activeId = batchId;
		if (this.detail?.batch.id !== batchId) {
			this.detail = null;
			this.error = '';
			this.mutationError = '';
			this.savedRefreshFailed = false;
			this.previewStale = false;
		}
		this.readStatus = batchId ? (this.detail ? 'refreshing' : 'loading') : 'ready';
		await Promise.all([this.loadHistory(), this.refresh()]);
	}

	async loadHistory() {
		const generation = this.generation;
		this.loading = true;
		try {
			const history = await this.api.history({ limit: 100 });
			if (generation === this.generation) {
				this.history = history.batches;
				this.historyError = '';
			}
		}
		catch {
			if (generation === this.generation)
				this.historyError = get(t)('durableImport.historyError');
		}
		finally {
			if (generation === this.generation)
				this.loading = false;
		}
	}

	async moreHistory() {
		const generation = this.generation;
		const before = this.history.at(-1)?.id;
		if (!before || this.loading)
			return;
		this.loading = true;
		try {
			const next = await this.api.history({ limit: 100, before });
			if (generation === this.generation) {
				this.history = [...new SvelteMap([...this.history, ...next.batches].map(batch => [batch.id, batch])).values()];
				this.historyError = '';
			}
		}
		catch {
			if (generation === this.generation)
				this.historyError = get(t)('durableImport.historyError');
		}
		finally {
			if (generation === this.generation)
				this.loading = false;
		}
	}

	private applyDetail(detail: Detail) {
		this.detail = detail;
		this.previewStale = false;
		this.history = this.history.map(batch => batch.id === detail.batch.id ? detail.batch : batch);
		const counts = JSON.stringify(detail.counts);
		if (counts !== this.previousCounts) {
			for (const key of IMPORT_VERSIONS)
				entityVersions.bump(key);
			this.previousCounts = counts;
		}
	}

	private applyBatch(batch: Batch) {
		this.activeId = batch.id;
		this.detail = this.detail?.batch.id === batch.id
			? { ...this.detail, batch }
			: { batch, files: [], rows: [], counts: {} };
		this.history = [batch, ...this.history.filter(item => item.id !== batch.id)];
		if (batch.state === 'draft')
			this.previewStale = true;
	}

	async refresh(progressOnly = false): Promise<boolean> {
		clearTimeout(this.timer);
		this.timer = undefined;
		if (!this.activeId)
			return true;
		const generation = this.generation;
		const read = ++this.readGeneration;
		const batchId = this.activeId;
		const current = () => generation === this.generation && read === this.readGeneration && batchId === this.activeId;
		this.readStatus = this.detail ? 'refreshing' : 'loading';
		let completionReadFailed = false;
		try {
			if (progressOnly && this.detail) {
				const status = await this.api.status({ batchId });
				if (!current())
					return false;
				this.applyDetail({ ...this.detail, batch: status.batch, counts: status.counts });
				completionReadFailed = status.batch.state !== 'running';
				if (status.batch.state === 'running') {
					this.error = '';
					this.readStatus = 'ready';
					return true;
				}
			}
			const detail = await this.api.detail({ batchId });
			if (!current())
				return false;
			this.applyDetail(detail);
			this.error = '';
			this.readStatus = 'ready';
			this.savedRefreshFailed = false;
			completionReadFailed = false;
			return true;
		}
		catch (error) {
			if (current()) {
				this.readStatus = error instanceof ApiError && (error.status === 401 || error.status === 403)
					? 'denied'
					: error instanceof ApiError && error.status === 404 ? 'unavailable' : 'error';
				this.error = get(t)('durableImport.loadError');
				if (this.readStatus === 'denied' || this.readStatus === 'unavailable')
					this.detail = null;
			}
			return false;
		}
		finally {
			if (current() && this.detail && (this.detail.batch.state === 'running' || completionReadFailed)) {
				clearTimeout(this.timer);
				this.timer = setTimeout(() => {
					void this.refresh(this.detail?.batch.state === 'running');
				}, 3000);
			}
		}
	}

	private async mutate<T>(request: () => Promise<T>, message: string, apply?: (result: T) => void) {
		if (this.busy)
			return null;
		const generation = this.generation;
		this.readGeneration++; // A prior read must not replace the confirmed write response.
		this.busy = true;
		this.mutationError = '';
		try {
			const result = await this.dependencies.runMutation(async () => {
				try {
					return await request();
				}
				catch (error) {
					if (generation === this.generation)
						this.mutationError = get(t)(error instanceof ApiError && error.status === 409 ? 'mutation.conflict' : 'durableImport.writeError');
					throw error;
				}
			}, {
				successMessage: get(t)(message),
				versionKeys: [...IMPORT_VERSIONS],
				onSuccess: async (confirmed) => {
					if (generation !== this.generation)
						return;
					apply?.(confirmed);
					if (!await this.refresh() && generation === this.generation) {
						this.savedRefreshFailed = true;
						throw new Error(get(t)('mutation.savedRefreshFailed'));
					}
				},
			});
			return generation === this.generation ? result : null;
		}
		finally { this.busy = false; }
	}

	create(academicYearId: string, defaultOnExisting: ImportMode, enrollmentEffectiveDate: string) {
		return this.mutate(() => this.api.create({ academicYearId, defaultOnExisting, enrollmentEffectiveDate: enrollmentEffectiveDate || null }), 'durableImport.created', batch => this.applyBatch(batch));
	}

	settings(defaultOnExisting: ImportMode, enrollmentEffectiveDate: string) {
		const batchId = this.detail?.batch.id;
		if (!batchId)
			return Promise.resolve(null);
		return this.mutate(() => this.api.settings({ batchId, defaultOnExisting, enrollmentEffectiveDate: enrollmentEffectiveDate || null }), 'durableImport.settingsSaved', batch => this.applyBatch(batch));
	}

	async submit(file: File, type: DurableImportType, fileId?: string) {
		const batchId = this.detail?.batch.id;
		if (!batchId)
			return null;
		return this.mutate(async () => {
			if (file.size > 5 * 1024 * 1024)
				throw new Error(get(t)('durableImport.fileLimit'));
			const bytes = new Uint8Array(await file.arrayBuffer());
			let binary = '';
			for (let offset = 0; offset < bytes.length; offset += 8192)
				binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
			return this.api.submit({ batchId, type, fileId, fileName: file.name, base64: btoa(binary) });
		}, 'durableImport.uploaded', (saved) => {
			this.previewStale = true;
			if (this.detail)
				this.detail = { ...this.detail, files: [...this.detail.files.filter(existing => existing.fileId !== saved.fileId), saved] };
		});
	}

	validate() {
		const batchId = this.detail?.batch.id;
		return batchId ? this.mutate(() => this.api.validate({ batchId }), 'durableImport.validated', detail => this.applyDetail(detail)) : Promise.resolve(null);
	}

	confirm() {
		const batch = this.detail?.batch;
		if (!batch || !this.canExecute || !batch.previewDigest)
			return Promise.resolve(null);
		const payload = { batchId: batch.id, revision: batch.revision, previewDigest: batch.previewDigest };
		return this.mutate(() => this.api.confirm(payload), 'durableImport.started', result => this.applyBatch(result));
	}

	retry() {
		const batchId = this.detail?.batch.id;
		return batchId ? this.mutate(() => this.api.retry({ batchId }), 'durableImport.validated', detail => this.applyDetail(detail)) : Promise.resolve(null);
	}

	cancel() {
		const batchId = this.detail?.batch.id;
		return batchId ? this.mutate(() => this.api.cancel({ batchId }), 'durableImport.cancelled', batch => this.applyBatch(batch)) : Promise.resolve(null);
	}

	async template(type: DurableImportType, format: 'csv' | 'xlsx') {
		const generation = this.generation;
		const result = await this.dependencies.runMutation(() => this.api.template({ type, format }));
		if (result && generation === this.generation)
			this.download(result);
	}

	async report(fileId: string, format: 'csv' | 'xlsx' = 'xlsx') {
		const generation = this.generation;
		const batchId = this.detail?.batch.id;
		if (!batchId)
			return;
		const result = await this.dependencies.runMutation(() => this.api.report({ batchId, fileId, format }));
		if (result && generation === this.generation)
			this.download(result);
	}

	private download(result: Download) {
		const bytes = Uint8Array.from(atob(result.base64), value => value.charCodeAt(0));
		const url = URL.createObjectURL(new Blob([bytes], { type: result.contentType }));
		const link = document.createElement('a');
		link.href = url;
		link.download = result.fileName;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
}
