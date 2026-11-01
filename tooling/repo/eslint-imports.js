// Keep the established import ordering identical in Bun and editor lint sessions.
export const importOrder = ['error', {
  groups: ['type-import', ['type-parent', 'type-sibling', 'type-index', 'type-internal'], 'value-builtin', 'value-external', 'value-internal', ['value-parent', 'value-sibling', 'value-index'], 'side-effect', 'ts-equals-import', 'unknown'],
  customGroups: [{ groupName: 'value-external', elementNamePattern: '^bun(?::|$)', modifiers: ['value'] }],
  newlinesBetween: 'ignore',
  newlinesInside: 'ignore',
  order: 'asc',
  type: 'natural',
}]
