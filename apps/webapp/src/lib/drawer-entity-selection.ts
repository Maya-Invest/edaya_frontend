/** Tracks the last drawer entity id so tab/query navigations do not re-resolve selection. */
export function createDrawerEntitySelection() {
	let lastId: string | undefined;

	return function shouldResolve(id: string | undefined): boolean {
		if (!id) {
			lastId = undefined;
			return false;
		}
		if (id === lastId) {
			return false;
		}
		lastId = id;
		return true;
	};
}

/** Hide drawer chrome only when the selected record is missing or does not match the URL id. */
export function drawerEntityLoading(selectedId: string | undefined, urlId: string | undefined): boolean {
	return !selectedId || selectedId !== urlId;
}
