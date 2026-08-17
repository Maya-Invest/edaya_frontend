import { describe, expect, test } from 'bun:test';
import { ACTION_MENU_BUTTON_NAME } from '../../scripts/qa-harness-ui';
import { en } from '../../src/lib/i18n/dictionaries/en.ts';
import { fr } from '../../src/lib/i18n/dictionaries/fr.ts';

/** The locator that caused the billing-drawer 30s timeout. */
const LEGACY_DELETE_MENU_BUTTON_NAME = /actions|menu|plus d|more|⋯/i;

describe('isDeleteControlVisible locators', () => {
	test('legacy /menu/ locator matches sidebar toggle labels (the timeout cause)', () => {
		expect(LEGACY_DELETE_MENU_BUTTON_NAME.test(fr['sidebar.show'])).toBe(true);
		expect(LEGACY_DELETE_MENU_BUTTON_NAME.test(en['sidebar.show'])).toBe(true);
		expect(LEGACY_DELETE_MENU_BUTTON_NAME.test(fr['sidebar.hide'])).toBe(true);
		expect(LEGACY_DELETE_MENU_BUTTON_NAME.test(en['sidebar.hide'])).toBe(true);
	});

	test('action-menu locator matches list overflow and row-action labels', () => {
		expect(ACTION_MENU_BUTTON_NAME.test(fr['list.moreActions'])).toBe(true);
		expect(ACTION_MENU_BUTTON_NAME.test(en['list.moreActions'])).toBe(true);
		expect(ACTION_MENU_BUTTON_NAME.test(fr['list.rowActions'])).toBe(true);
		expect(ACTION_MENU_BUTTON_NAME.test(en['list.rowActions'])).toBe(true);
	});

	test('action-menu locator does not match sidebar toggle labels', () => {
		expect(ACTION_MENU_BUTTON_NAME.test(fr['sidebar.show'])).toBe(false);
		expect(ACTION_MENU_BUTTON_NAME.test(en['sidebar.show'])).toBe(false);
		expect(ACTION_MENU_BUTTON_NAME.test(fr['sidebar.hide'])).toBe(false);
		expect(ACTION_MENU_BUTTON_NAME.test(en['sidebar.hide'])).toBe(false);
	});
});
