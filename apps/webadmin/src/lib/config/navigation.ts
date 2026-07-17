export const navItems = [
	{ href: '/', label: 'Overview', description: 'Platform health and activity' },
	{ href: '/tenants', label: 'Tenants', description: 'Schools and organizations' },
	{ href: '/users', label: 'Users', description: 'Platform operator accounts' },
	{ href: '/billing', label: 'Billing', description: 'Plans and subscriptions' },
] as const;

export const placeholderCards = [
	{
		title: 'Active tenants',
		value: '—',
		hint: 'Connect to the platform API',
	},
	{
		title: 'Pending onboarding',
		value: '—',
		hint: 'Schools awaiting setup',
	},
	{
		title: 'Open support cases',
		value: '—',
		hint: 'Escalations from school admins',
	},
] as const;
