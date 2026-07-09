#!/usr/bin/env bun
import process from 'node:process'

const DEFAULT_WEBAPP_ORIGIN = 'https://app-staging.edaya.softilab.dev'
const DEFAULT_SAAS_ADMIN_ORIGIN = 'https://admin-staging.edaya.softilab.dev'

interface SmokeCheckResult {
  id: string
  label: string
  status: 'passed' | 'failed'
  detail?: string
}

function resolveOrigin(name: 'WEBAPP' | 'SAAS_ADMIN'): string {
  const envKey = name === 'WEBAPP' ? 'STAGING_WEBAPP_ORIGIN' : 'STAGING_SAAS_ADMIN_ORIGIN'
  const fallback = name === 'WEBAPP' ? DEFAULT_WEBAPP_ORIGIN : DEFAULT_SAAS_ADMIN_ORIGIN
  return (process.env[envKey] ?? fallback).replace(/\/+$/, '')
}

async function checkSpaShell(origin: string, id: string, label: string): Promise<SmokeCheckResult> {
  const response = await fetch(`${origin}/`, {
    headers: { accept: 'text/html' },
    redirect: 'follow',
  })

  if (!response.ok) {
    return {
      id,
      label,
      status: 'failed',
      detail: `GET / returned ${response.status}`,
    }
  }

  const html = await response.text()
  if (!html.includes('<!doctype html') && !html.includes('<!DOCTYPE html')) {
    return {
      id,
      label,
      status: 'failed',
      detail: 'Response is not an HTML document',
    }
  }

  return { id, label, status: 'passed' }
}

export async function runWebStagingSmoke(): Promise<{ checks: SmokeCheckResult[], passed: boolean }> {
  const webappOrigin = resolveOrigin('WEBAPP')
  const saasAdminOrigin = resolveOrigin('SAAS_ADMIN')
  const checks = [
    await checkSpaShell(webappOrigin, 'W1', 'Webapp staging shell'),
    await checkSpaShell(saasAdminOrigin, 'W2', 'SaaS admin staging shell'),
  ]

  return {
    checks,
    passed: checks.every(check => check.status === 'passed'),
  }
}

if (import.meta.main) {
  const webappOrigin = resolveOrigin('WEBAPP')
  const saasAdminOrigin = resolveOrigin('SAAS_ADMIN')
  console.log(`Running web staging smoke against ${webappOrigin} and ${saasAdminOrigin}`)

  const result = await runWebStagingSmoke()
  for (const check of result.checks) {
    const icon = check.status === 'passed' ? '✓' : '✗'
    const suffix = check.detail ? ` — ${check.detail}` : ''
    console.log(`${icon} ${check.id} ${check.label} [${check.status}]${suffix}`)
  }

  if (result.passed) {
    console.log('\nWeb staging smoke passed.')
    console.log('Manual follow-up: sign in on /login, open shell navigation, upload a file to R2.')
    process.exit(0)
  }

  console.error('\nWeb staging smoke failed.')
  process.exit(1)
}
