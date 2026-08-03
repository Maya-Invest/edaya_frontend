import type { StructureTemplateCatalog, OnboardingListStructureTemplatesResponse } from '$lib/onboarding/structure-template-model';
import { PUBLIC_API_URL } from '$env/static/public';
import { parseApiResponse, resolveApiUrl } from '$lib/api/http';
import { previewClassNamesFromCatalog } from '$lib/onboarding/class-naming';
import { buildCatalogFromTemplates } from '$lib/onboarding/structure-template-model';
import { resolveClientRoutePath } from '@maya-invest/edaya-api-client';

export type { ClassNamingMode } from '$lib/onboarding/class-naming';

export type {
	CatalogGradeLevel,
	CatalogSubject,
	OnboardingListStructureTemplatesResponse,
	StructureTemplateCatalog,
	StructureTemplateDefinition,
} from '$lib/onboarding/structure-template-model';

export {
	buildCatalogFromTemplates,
	getCatalogGradeLevel,
	gradeLevelsForModels,
	subjectsForGradeLevelIds,
} from '$lib/onboarding/structure-template-model';
export { previewClassNamesFromCatalog };

let cachedCatalog: StructureTemplateCatalog | null = null;
let cachedCountry: string | null = null;
let inflight: Promise<StructureTemplateCatalog> | null = null;
let inflightCountry: string | null = null;

async function fetchStructureTemplates(
	country: string,
): Promise<OnboardingListStructureTemplatesResponse> {
	const { authSession } = await import('$lib/auth/session.svelte');
	const basePath = resolveClientRoutePath('onboarding/structure-templates');
	const path = `${basePath}?country=${encodeURIComponent(country)}`;
	const headers = new Headers({
		Accept: 'application/json',
	});
	if (authSession.sessionKind) {
		headers.set('X-Actor-Kind', authSession.sessionKind);
		if (authSession.userId) {
			headers.set('X-Actor-Id', authSession.userId);
		}
	}

	const response = await fetch(resolveApiUrl(PUBLIC_API_URL || '', path), {
		method: 'GET',
		headers,
		credentials: 'include',
	});

	return parseApiResponse<OnboardingListStructureTemplatesResponse>(path, response);
}

export function getCachedStructureTemplateCatalog(): StructureTemplateCatalog | null {
	return cachedCatalog;
}

export function clearStructureTemplateCatalogCache(): void {
	cachedCatalog = null;
	cachedCountry = null;
	inflight = null;
	inflightCountry = null;
}

export async function loadStructureTemplateCatalog(country: string): Promise<StructureTemplateCatalog> {
	const normalizedCountry = country.trim();
	if (cachedCatalog && cachedCountry === normalizedCountry) {
		return cachedCatalog;
	}
	if (inflight && inflightCountry === normalizedCountry) {
		return inflight;
	}

	inflightCountry = normalizedCountry;
	inflight = (async () => {
		const response = await fetchStructureTemplates(normalizedCountry);
		const catalog = buildCatalogFromTemplates(response.templates, response.countryCode);
		cachedCatalog = catalog;
		cachedCountry = normalizedCountry;
		return catalog;
	})();

	try {
		return await inflight;
	}
	finally {
		if (inflightCountry === normalizedCountry) {
			inflight = null;
			inflightCountry = null;
		}
	}
}
