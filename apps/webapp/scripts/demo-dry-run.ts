#!/usr/bin/env bun
/**
 * CLI entry for the demo dry-run integration harness.
 * Requires: webapp on :5173, API seeded with demo-ci.
 */
import { runDemoDryRun } from '../tests/integration/demo-dry-run/runner';

const summary = await runDemoDryRun();
process.exit(summary.failed > 0 ? 1 : 0);
