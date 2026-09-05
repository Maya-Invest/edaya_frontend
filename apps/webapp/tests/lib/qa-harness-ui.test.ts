import { describe, expect, test } from 'bun:test';
import {
	ACTION_MENU_BUTTON_NAME,
	ACADEMIC_YEAR_END_DATE_CONTROL,
	ACADEMIC_YEAR_START_DATE_CONTROL,
	REMOVE_ANNOUNCEMENT_TARGET_CONTROL,
} from '../../scripts/qa-harness-ui';
import { defaultAcademicYearPreset } from '../../src/lib/onboarding/school-step-defaults';
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

	test('remove-recipient locator matches announcement copy only', () => {
		expect(REMOVE_ANNOUNCEMENT_TARGET_CONTROL.test(en['announcements.removeTarget'])).toBe(true);
		expect(REMOVE_ANNOUNCEMENT_TARGET_CONTROL.test(fr['announcements.removeTarget'])).toBe(true);
		expect(REMOVE_ANNOUNCEMENT_TARGET_CONTROL.test(en['common.delete'])).toBe(false);
		expect(REMOVE_ANNOUNCEMENT_TARGET_CONTROL.test(fr['common.delete'])).toBe(false);
	});

	test('academic year create locators match date fields, not a name', () => {
		expect(ACADEMIC_YEAR_START_DATE_CONTROL.test(en['academic.startDate'])).toBe(true);
		expect(ACADEMIC_YEAR_START_DATE_CONTROL.test(fr['academic.startDate'])).toBe(true);
		expect(ACADEMIC_YEAR_END_DATE_CONTROL.test(en['academic.endDate'])).toBe(true);
		expect(ACADEMIC_YEAR_END_DATE_CONTROL.test(fr['academic.endDate'])).toBe(true);
		expect(ACADEMIC_YEAR_START_DATE_CONTROL.test(en['academic.createYear'])).toBe(false);
		expect(ACADEMIC_YEAR_END_DATE_CONTROL.test(en['academic.createYear'])).toBe(false);
	});
});

describe('provisioned academic year identity', () => {
	test('journey heading is derived YYYY-YYYY, not an E2E free-text name', () => {
		const preset = defaultAcademicYearPreset(new Date('2026-09-03T12:00:00'));
		expect(preset.label).toBe('2026-2027');
		expect(preset.label.startsWith('E2E ')).toBe(false);
	});
});
