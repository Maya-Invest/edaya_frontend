import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
	extractClientBindingsFromOpenApi,
	X_EDAYA_KIND,
} from '@edaya/api-client/openapi-bindings'
import { describe, expect, it } from 'bun:test'

const openApiPath = resolve(
	import.meta.dirname,
	'../../../apps/webapp/src/lib/api/openapi.json',
)

describe('extractClientBindingsFromOpenApi', () => {
	it('reads client bindings from annotated core operations', () => {
		const openApi = JSON.parse(readFileSync(openApiPath, 'utf8')) as {
			paths?: Record<string, Record<string, Record<string, unknown>>>
		}

		const bindings = extractClientBindingsFromOpenApi(openApi)

		expect(bindings.entities.schools).toEqual({
			publicName: 'schools',
			schemaName: 'School',
			allowDirectSave: true,
		})
		expect(bindings.commands.registerSchool.publicName).toBe('register-school')
		expect(bindings.queries.getOverdueFeeCount.publicName).toBe(
			'get-overdue-fee-count',
		)

		const listOperation = openApi.paths?.['/core/entities/students/list']?.post
		expect(listOperation?.[X_EDAYA_KIND]).toBe('entity')
	})

	it('fails when the OpenAPI spec has no annotated entity operations', () => {
		expect(() => extractClientBindingsFromOpenApi({ paths: {} })).toThrow(
			'OpenAPI spec has no x-edaya-kind entity operations',
		)
	})
})
