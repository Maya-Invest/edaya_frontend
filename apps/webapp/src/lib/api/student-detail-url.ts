export function studentDetailIdFromPathname(pathname: string): string | undefined {
	const school = pathname.match(/^\/school\/students\/([^/]+)/);
	if (school) {
		return school[1];
	}
	const classStudent = pathname.match(/^\/classes\/[^/]+\/students\/([^/]+)/);
	if (classStudent) {
		return classStudent[1];
	}
	return undefined;
}

export function studentDetailIdFromUrl(url: URL): string | undefined {
	return studentDetailIdFromPathname(url.pathname);
}
