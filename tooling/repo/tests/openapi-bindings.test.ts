import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
	CLIENT_BINDINGS_OPENAPI_EXTENSION,
	extractClientBindingsFromOpenApi,
} from '@edaya/api-client/openapi-bindings'
import { describe, expect, it } from 'bun:test'

const openApiPath = resolve(
	import.meta.dirname,
	'../../../apps/saas-admin/src/lib/api/openapi.json',
)

describe('extractClientBindingsFromOpenApi', () => {
	it('reads client bindings from the committed OpenAPI document', () => {
		const openApi = JSON.parse(readFileSync(openApiPath, 'utf8')) as {
			info?: Record<string, unknown>
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
		expect(openApi.info?.[CLIENT_BINDINGS_OPENAPI_EXTENSION]).toEqual(bindings)
	})

	it('fails when the OpenAPI extension is missing', () => {
		expect(() => extractClientBindingsFromOpenApi({ info: {} })).toThrow(
			`OpenAPI spec is missing info.${CLIENT_BINDINGS_OPENAPI_EXTENSION}`,
		)
	})
})
