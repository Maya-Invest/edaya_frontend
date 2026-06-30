#!/usr/bin/env bun
import { generateClientArtifacts, isOpenApiUrl } from '@edaya/client-codegen'
import {
	resolveArgvPath,
	trackedClientBindingsPath,
	trackedCreateClientPath,
	trackedOpenApiPath,
} from './paths.ts'

export async function generateClientArtifactsFromOpenApi(
	openApiInput = trackedOpenApiPath,
	options: {
		bindingsOut?: string
		clientOut?: string
	} = {},
): Promise<void> {
	await generateClientArtifacts({
		input: openApiInput,
		bindingsOut: options.bindingsOut ?? trackedClientBindingsPath,
		clientOut: options.clientOut ?? trackedCreateClientPath,
	})
}

/** @deprecated Use generateClientArtifactsFromOpenApi */
export async function generateClientBindings(
	openApiInput = trackedOpenApiPath,
	outputPath = trackedClientBindingsPath,
): Promise<void> {
	await generateClientArtifactsFromOpenApi(openApiInput, { bindingsOut: outputPath })
}

if (import.meta.main) {
	const openApiInput = resolveArgvPath('--openapi', trackedOpenApiPath)
	const bindingsOut = resolveArgvPath('--output', trackedClientBindingsPath)
	const clientOut = resolveArgvPath('--client-out', trackedCreateClientPath)

	await generateClientArtifactsFromOpenApi(openApiInput, { bindingsOut, clientOut })
	const sourceLabel = isOpenApiUrl(openApiInput) ? openApiInput : openApiInput
	console.log(`API client artifacts generated from ${sourceLabel}`)
}
