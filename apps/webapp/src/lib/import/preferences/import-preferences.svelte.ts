import { browser } from '$app/environment';

export type ImportMultiValueSeparator = ';' | '&';

export const IMPORT_MULTI_VALUE_SEPARATORS: readonly ImportMultiValueSeparator[] = [';', '&'];

const STORAGE_KEY = 'edaya:importMultiValueSeparator';

function readStoredSeparator(): ImportMultiValueSeparator {
	if (!browser) {
		return ';';
	}
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === '&' ? '&' : ';';
}

class ImportPreferencesState {
	multiValueSeparator = $state<ImportMultiValueSeparator>(readStoredSeparator());

	setMultiValueSeparator(separator: ImportMultiValueSeparator) {
		this.multiValueSeparator = separator;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, separator);
		}
	}
}

export const importPreferences = new ImportPreferencesState();
