import { redirect } from '@sveltejs/kit';
import { legacyStructureHref } from '../../structure/lib/structure-navigation';

export function load({ url }: { url: URL }) {
	redirect(307, legacyStructureHref(url));
}
