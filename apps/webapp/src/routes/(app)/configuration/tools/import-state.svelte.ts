import type { components } from '$lib/api/schema';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { t } from '$lib/i18n';
import { get } from 'svelte/store';

type Batch = components['schemas']['SchoolImportBatch'];
type Detail = components['schemas']['SchoolImportDetail'];
type Download = components['schemas']['SchoolImportDownload'];
export type ImportMode = Batch['defaultOnExisting'];
export type DurableImportType = Detail['files'][number]['type'];
/** Owns transport and polling. Closing the modal stops polling, never the backend batch. */
export class DataImportState {
    detail = $state<Detail | null>(null);
    history = $state<Batch[]>([]);
    busy = $state(false);
    loading = $state(false);
    error = $state('');
    private scope = '';
    private generation = 0;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private activeId: string | null = null;
    private previousCounts = '';
    private get api() { return getBrowserSchoolClient().imports; }
    disconnect() {
        this.generation++;
        clearTimeout(this.timer);
        this.timer = undefined;
        this.loading = false;
    }

    clear() {
        this.disconnect();
        this.detail = null;
        this.history = [];
        this.error = '';
        this.activeId = null;
    }

    async connect(batchId: string | null, scope: string) {
        this.disconnect();
        if (scope !== this.scope) {
            this.detail = null;
            this.history = [];
            this.error = '';
            this.scope = scope;
        }
        this.activeId = batchId;
        if (this.detail?.batch.id !== batchId)
            this.detail = null;
        this.loading = true;
        const generation = this.generation;
        try {
            const history = await this.api.history({ limit: 100 });
            if (generation !== this.generation)
                return;
            this.history = history.batches;
            await this.refresh();
        }
        catch {
            if (generation === this.generation)
                this.error = get(t)('durableImport.loadError');
        }
        finally {
            if (generation === this.generation)
                this.loading = false;
        }
    }

    async moreHistory() {
        const generation = this.generation;
        const before = this.history.at(-1)?.id;
        if (!before)
            return;
        try {
            const next = await this.api.history({ limit: 100, before,
            });
            if (generation === this.generation)
                this.history = [...this.history, ...next.batches];
        }
        catch {
            if (generation === this.generation)
                this.error = get(t)('durableImport.loadError');
        }
    }

    async refresh() {
        if (!this.activeId)
            return;
        const generation = this.generation;
        try {
            const detail = await this.api.detail({ batchId: this.activeId });
            if (generation !== this.generation)
                return;
            this.detail = detail;
            this.history = this.history.map(batch => batch.id === detail.batch.id ? detail.batch : batch);
            this.error = '';
            const counts = JSON.stringify(detail.counts);
            if (counts !== this.previousCounts) {
                for (const key of ['students', 'guardians', 'teachers', 'staff', 'subjects', 'planning', 'enrollments', 'billing', 'payments'] as const)
                    entityVersions.bump(key);
                this.previousCounts = counts;
            }
        }
        catch {
            if (generation === this.generation)
                this.error = get(t)('durableImport.loadError');
        }
        finally {
            if (generation === this.generation && this.detail?.batch.state === 'running') {
                clearTimeout(this.timer);
                this.timer = setTimeout(() => {
                    void this.refresh();
                }, 3000);
            }
        }
    }

    private async mutate<T>(request: () => Promise<T>, message: string) {
        if (this.busy)
            return null;
        const generation = this.generation;
        this.busy = true;
        try {
            const result = await runMutation(request, {
                successMessage: get(t)(message),
                onSuccess: async () => {
                    if (generation === this.generation)
                        await this.refresh();
                },
            });
            return generation === this.generation ? result : null;
        }
        finally {
            this.busy = false;
        }
    }

    create(academicYearId: string, defaultOnExisting: ImportMode, enrollmentEffectiveDate: string) {
        return this.mutate(() => this.api.create({ academicYearId, defaultOnExisting, enrollmentEffectiveDate: enrollmentEffectiveDate || null }), 'durableImport.created');
    }

    settings(defaultOnExisting: ImportMode, enrollmentEffectiveDate: string) {
        const batchId = this.detail!.batch.id;
        return this.mutate(() => this.api.settings({ batchId, defaultOnExisting, enrollmentEffectiveDate: enrollmentEffectiveDate || null }), 'durableImport.settingsSaved');
    }

    async submit(file: File, type: DurableImportType, fileId?: string) {
        const batchId = this.detail!.batch.id;
        return this.mutate(async () => {
            if (file.size > 5 * 1024 * 1024)
                throw new Error(get(t)('durableImport.fileLimit'));
            const bytes = new Uint8Array(await file.arrayBuffer());
            let binary = '';
            for (let offset = 0; offset < bytes.length; offset += 8192)
                binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
            return this.api.submit({ batchId, type, fileId, fileName: file.name, base64: btoa(binary) });
        }, 'durableImport.uploaded');
    }

    validate() { return this.mutate(() => this.api.validate({ batchId: this.detail!.batch.id }), 'durableImport.validated'); }
    confirm() {
        const batch = this.detail!.batch;
        return this.mutate(() => this.api.confirm({ batchId: batch.id, revision: batch.revision, previewDigest: batch.previewDigest! }), 'durableImport.started');
    }

    retry() { return this.mutate(() => this.api.retry({ batchId: this.detail!.batch.id }), 'durableImport.validated'); }
    cancel() { return this.mutate(() => this.api.cancel({ batchId: this.detail!.batch.id }), 'durableImport.cancelled'); }
    async template(type: DurableImportType, format: 'csv' | 'xlsx') {
        const generation = this.generation;
        const result = await runMutation(() => this.api.template({ type, format }));
        if (result && generation === this.generation)
            this.download(result);
    }

    async report(fileId: string, format: 'csv' | 'xlsx' = 'xlsx') {
        const generation = this.generation;
        const result = await runMutation(() => this.api.report({ batchId: this.detail!.batch.id, fileId, format }));
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
