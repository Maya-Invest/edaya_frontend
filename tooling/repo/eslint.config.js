import antfu from '@antfu/eslint-config'
import { importOrder } from './eslint-imports.js'

export default antfu({
  rules: {
    'perfectionist/sort-imports': importOrder,
    'no-new': 'off',
    'antfu/no-top-level-await': 'off',
    'node/prefer-global/process': 'off',
    'no-console': 'off',
  },
})
