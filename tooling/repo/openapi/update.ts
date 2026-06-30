#!/usr/bin/env bun
import { exportOpenApi } from './export.ts'
import { generateClientBindings } from './generate-bindings.ts'
import { generateSchema } from './generate-schema.ts'

await exportOpenApi()
await generateSchema()
generateClientBindings()

console.log('Generated API artifacts updated.')
