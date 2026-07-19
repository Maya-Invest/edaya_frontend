export interface ImportPageSlice {
	ready: boolean;
}

export function emptyImportSlice(): ImportPageSlice {
	return {
		ready: true,
	};
}
