import type { DocumentIssuance, DocumentTemplateCatalogItem, DocumentTemplateKey } from '$lib/api/documents-types';
import type { PageQueryRequest } from '../../../lib/teacher-page-status';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadDocumentIssuances, loadDocumentTemplates } from '$lib/api/documents-data';
import { retryDocumentIssuanceMutation, downloadDocumentMutation, requestDocumentIssuanceMutation, voidDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

const TEACHER_DOCUMENTS_TAB_KEY = Symbol('teacher-documents-tab');
const TEACHER_GENERATE_TEMPLATE_KEYS: readonly DocumentTemplateKey[] = ['teacher-timetable.v1'];

export interface TeacherDocumentsTabSlice {
	teacherId: string;
	issuances: DocumentIssuance[];
	templates: DocumentTemplateCatalogItem[];
}

export class TeacherDocumentsTabState {
	private readonly versionedQuery = new VersionedRouteQuery(new RouteVersionSnapshot(['documents', 'teachers']));
	invalidateIfStale = () => this.versionedQuery.invalidateIfStale();

	performRetryDocumentIssuance = (...args: Parameters<typeof retryDocumentIssuanceMutation>) => retryDocumentIssuanceMutation(...args);

	performDownloadDocument = (...args: Parameters<typeof downloadDocumentMutation>) => downloadDocumentMutation(...args);

	performRequestDocumentIssuance = (...args: Parameters<typeof requestDocumentIssuanceMutation>) => requestDocumentIssuanceMutation(...args);

	performVoidDocumentIssuance = (...args: Parameters<typeof voidDocumentIssuanceMutation>) => voidDocumentIssuanceMutation(...args);

	slice = $state<TeacherDocumentsTabSlice | null>(null);
	documentsVersion = $state(entityVersions.documents);

	constructor(private readonly getPage: () => TeachersPageState) {}

	clear() {
		this.versionedQuery.clear();
		this.slice = null;
	}

	issuancesFor(teacherId: string): DocumentIssuance[] {
		return this.slice?.teacherId === teacherId ? this.slice.issuances : [];
	}

	templatesFor(teacherId: string): DocumentTemplateCatalogItem[] {
		return this.slice?.teacherId === teacherId ? this.slice.templates : [];
	}

	generateTemplatesFor(teacherId: string): DocumentTemplateCatalogItem[] {
		return this.templatesFor(teacherId).filter(template =>
			TEACHER_GENERATE_TEMPLATE_KEYS.includes(template.templateKey),
		);
	}

	query() {
		return this.versionedQuery.track((url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				this.documentsVersion = entityVersions.documents;
				const teacherId = teacherDetailIdFromUrl(url);
				const academicYearId = academicContext.yearId;
				this.getPage();
				if (!teacherId || !academicYearId) {
					return {};
				}
				const client = getBrowserSchoolClient();
				const [issuances, templates] = await Promise.all([
					loadDocumentIssuances(client, { sourceId: teacherId, academicYearId }),
					loadDocumentTemplates(client),
				]);
				signal.throwIfAborted();
				this.slice = { teacherId, issuances, templates };
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load teacher documents.',
		}, request));
	}
}

export function setTeacherDocumentsTabState(state: TeacherDocumentsTabState) {
	setContext(TEACHER_DOCUMENTS_TAB_KEY, state);
}

export function getTeacherDocumentsTabState() {
	return getContext<TeacherDocumentsTabState>(TEACHER_DOCUMENTS_TAB_KEY);
}
