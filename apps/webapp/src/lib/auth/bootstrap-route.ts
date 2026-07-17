export function shouldBootstrapAuthOnly(pathname: string): boolean {
	return pathname === '/login'
		|| pathname.startsWith('/login/')
		|| pathname.startsWith('/invite/')
		|| pathname === '/onboarding'
		|| pathname.startsWith('/onboarding/');
}
