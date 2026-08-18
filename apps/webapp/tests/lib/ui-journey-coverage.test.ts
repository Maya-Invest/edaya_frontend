import { describe, expect, it } from 'bun:test';
import {
	CLASS_NAV_DEFS,
	CONFIG_NAV_DEFS,
	FINANCE_NAV_DEFS,
	SCHOOL_NAV_DEFS,
} from '../../src/lib/navigation/nav-catalog';
import { DRAWER_TAB_PATTERNS, MODAL_SURFACES } from '../../scripts/qa-route-catalog';
import {
	claimedModals,
	claimedPaths,
	claimedTabs,
} from '../integration/setup/journey-surfaces';

function classNavPath(href: string): string {
	return `/classes/[classId]/${href}`;
}

describe('UI journey surface claims', () => {
	const paths = claimedPaths();
	const modals = claimedModals();
	const tabs = claimedTabs();

	it('claims every school / finance / configuration nav href', () => {
		const missing: string[] = [];
		for (const def of [...SCHOOL_NAV_DEFS, ...FINANCE_NAV_DEFS, ...CONFIG_NAV_DEFS]) {
			if (!paths.has(def.href)) {
				missing.push(def.href);
			}
		}
		expect(missing).toEqual([]);
	});

	it('claims every class nav segment', () => {
		const missing = CLASS_NAV_DEFS
			.map(def => classNavPath(def.href))
			.filter(path => !paths.has(path));
		expect(missing).toEqual([]);
	});

	it('claims every MODAL_SURFACES entry', () => {
		const missing = MODAL_SURFACES
			.map(surface => `${surface.parentRoute}::${surface.modal}`)
			.filter(key => !modals.has(key));
		expect(missing).toEqual([]);
	});

	it('claims every DRAWER_TAB_PATTERNS tab', () => {
		const missing: string[] = [];
		for (const pattern of DRAWER_TAB_PATTERNS) {
			for (const tab of pattern.tabs) {
				const key = `${pattern.routePattern}::${tab}`;
				if (!tabs.has(key)) {
					missing.push(key);
				}
			}
		}
		expect(missing).toEqual([]);
	});
});
