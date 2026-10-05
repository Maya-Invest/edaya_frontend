#!/usr/bin/env bun
import { parseScreenshotOptions } from '../tests/integration/screenshots/options';
import { runScreenshotGallery } from '../tests/integration/screenshots/runner';
try {
  const options = parseScreenshotOptions(process.argv.slice(2));
  if (options.help) console.log('bun run screenshots [--device mobile,tablet,desktop] [--locale fr,en] [--module school] [--scenario ID-PREFIX] [--checkpoint ID] [--out NEW-DIRECTORY] [--headed] [--list]');
  else process.exitCode = (await runScreenshotGallery(options)).ok ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
