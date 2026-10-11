import { importOrder } from '../../tooling/repo/eslint-imports.js'
import antfu from '@antfu/eslint-config'

export default antfu(
	{
		svelte: true,
		typescript: true,
		stylistic: {
			indent: 'tab',
			semi: true,
			quotes: 'single',
		},
		ignores: [
			'**/.svelte-kit/**',
			'**/node_modules/**',
			'**/build/**',
		],
		rules: {
    'perfectionist/sort-imports': importOrder,
			'no-new': 'off',
			'perfectionist/sort-named-imports': 'off',
			'svelte/html-quotes': ['error', { prefer: 'double' }],
			'svelte/no-navigation-without-resolve': ['error', { ignoreLinks: true }],
		},
	},
)
