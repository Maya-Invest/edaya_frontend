import antfu from '@antfu/eslint-config'

export default antfu({
	rules: {
		'no-new': 'off',
	},
}, {
	files: ['tooling/repo/**'],
	rules: {
		'antfu/no-top-level-await': 'off',
		'node/prefer-global/process': 'off',
		'no-console': 'off',
	},
})
