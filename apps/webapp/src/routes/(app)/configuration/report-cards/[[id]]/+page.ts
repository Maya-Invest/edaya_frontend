import { redirect } from '@sveltejs/kit';
import { legacyReportCardsHref } from '../../structure/details/report-cards/lib/report-cards-helpers';

export function load({ url }: { url: URL }) {
	redirect(307, legacyReportCardsHref(url));
}
