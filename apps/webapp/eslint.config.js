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
      'src/lib/api/openapi.json',
      'src/lib/api/schema.d.ts',
    ],
    rules: {
      'no-new': 'off',
      'perfectionist/sort-named-imports': 'off',
      'svelte/html-quotes': ['error', { prefer: 'double' }],
      'svelte/no-navigation-without-resolve': ['error', { ignoreLinks: true }],
    },
  },
)
