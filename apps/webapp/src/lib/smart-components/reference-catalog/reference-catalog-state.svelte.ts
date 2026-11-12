import type { PageQueryRequest } from '$lib/queries/page-status';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

export type ReferenceCatalogueKind = 'academicDisciplines' | 'placementStatuses';
export interface ReferenceOption {
    id: string;
    schoolId: string;
    shortName?: string;
    label: string;
    isActive: boolean;
}
export class ReferenceCatalogState {
    rows = $state<ReferenceOption[]>([]);
    busy = $state(false);
    constructor(readonly kind: ReferenceCatalogueKind) {
    }

    async load(signal?: AbortSignal) {
        const schoolId = authSession.schoolId;
        if (!schoolId) {
            this.rows = [];
            return [];
        }
        const client = getBrowserSchoolClient();
        const rows = this.kind === 'academicDisciplines'
            ? (await listAllEntityPages(query => client.entities.academicDisciplines.list(query), { baseQuery: { schoolId } })).map(row => ({ ...row, label: row.name }))
            : (await listAllEntityPages(query => client.entities.placementStatuses.list(query), { baseQuery: { schoolId } })).map(row => ({ ...row, label: row.name }));
        signal?.throwIfAborted();
        if (schoolId !== authSession.schoolId)
            return [];
        this.rows = rows;
        return rows;
    }

    query = (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, { empty: () => ({ rows: [] }), hasItems: listPageHasItems, load: async signal => ({ rows: await this.load(signal) }) }, request);
    async save(input: {
        id?: string;
        shortName?: string;
        label: string;
        isActive: boolean;
    }) {
        this.busy = true;
        try {
            const client = getBrowserSchoolClient();
            const id = input.id ?? crypto.randomUUID();
            const value = await runMutation<unknown>(() => this.kind === 'academicDisciplines'
                ? client.commands.configureAcademicDiscipline({ id, shortName: input.shortName, name: input.label, isActive: input.isActive })
                : client.commands.configurePlacementStatus({ id, shortName: input.shortName, name: input.label, isActive: input.isActive }), { versionKeys: ['subjects', 'teachers', 'students'] });
            if (value === null)
                return false;
            await this.load();
            return true;
        }
        finally {
            this.busy = false;
        }
    }

    async remove(id: string) {
        this.busy = true;
        try {
            const client = getBrowserSchoolClient();
            const value = await runMutation<unknown>(() => this.kind === 'academicDisciplines' ? client.entities.academicDisciplines.delete({ id }) : client.entities.placementStatuses.delete({ id }), { versionKeys: ['subjects', 'students', 'teachers'] });
            if (value === null)
                return false;
            await this.load();
            return true;
        }
        finally {
            this.busy = false;
        }
    }
}
