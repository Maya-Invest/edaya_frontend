import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { resolvePageLoad } from '$lib/queries/page-status';

export class MarksReviewPageState {
  items = $state<components['schemas']['AssessmentMarksReviewsResponse']['items']>([]);
  total = $state(0);
  offset = $state(0);
  readonly limit = 25;
  query = (url: URL) => resolvePageLoad(url, {
    empty: () => ({}),
    load: async () => {
      this.offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const response = await getBrowserSchoolClient().queries.listAssessmentMarksReviews({ status: 'pending', periodId: academicContext.periodId || undefined, offset: this.offset, limit: this.limit });
      this.items = response.items;
      this.total = response.total;
      return {};
    },
    hasItems: () => this.total > 0,
    errorMessage: 'Impossible de charger les corrections à valider.',
  });
}
