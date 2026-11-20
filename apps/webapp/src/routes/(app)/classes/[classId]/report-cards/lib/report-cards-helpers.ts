export function reportCardDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/report-cards\/([^/]+)/);
	return match?.[2];
}

export function reportCardsClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/report-cards/);
	return match?.[1];
}
