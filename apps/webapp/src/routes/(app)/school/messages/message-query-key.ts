/** Message queries depend on selection and list filters, not reply form navigation. */
export function messageQueryKey(url: URL): string {
	const filters = new URLSearchParams();
	for (const key of ['view', 'status', 'order', 'offset']) {
		const value = url.searchParams.get(key);
		if (value)
			filters.set(key, value);
	}
	return `${url.pathname}?${filters}`;
}
