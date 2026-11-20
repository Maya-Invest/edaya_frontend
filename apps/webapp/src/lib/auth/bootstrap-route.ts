export function shouldBootstrapAuthOnly(pathname: string): boolean {
	return pathname === '/account/security'
		|| pathname === '/login'
		|| pathname.startsWith('/login/')
		|| pathname.startsWith('/invite/');
}
