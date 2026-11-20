import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test } from 'bun:test'
import { root } from '../runtime'

test.each([undefined, 'true', 'false'])('dev selects the OTP panel with override %s', (override) => {
  const moduleUrl = (path: string) => JSON.stringify(pathToFileURL(resolve(root, path)).href)
  // Isolate module mocks and exercise routing without starting the development servers.
  const script = `
    import { expect, mock } from 'bun:test';
    const runtimeUrl = ${moduleUrl('tooling/repo/ops/runtime.ts')};
    const clientUrl = ${moduleUrl('tooling/repo/ops/client.ts')};
    const runtime = await import(runtimeUrl);
    const client = await import(clientUrl);
    let checked = false;
    let launched = false;
    mock.module(clientUrl, () => ({ ...client, checkClient() { checked = true; } }));
    mock.module(runtimeUrl, () => ({ ...runtime, async run(command, options) {
      expect(checked).toBe(true);
      expect(command).toEqual(['bun', 'run', 'dev']);
      expect(options.timeout).toBe(0);
      expect(options.env.PUBLIC_TEST_OTP_ACCESS).toBe(${JSON.stringify(override ?? 'true')});
      Object.assign(process.env, options.env);
      const { default: config } = await import(${moduleUrl('apps/webapp/svelte.config.js')});
      expect(config.kit.alias.$testOtpPanel).toBe(${JSON.stringify(`src/lib/smart-components/test-otp-panel/${override === 'false' ? 'DisabledOtpPanel' : 'TestOtpPanel'}.svelte`)});
      launched = true;
      return '';
    } }));
    const { main } = await import(${moduleUrl('tooling/repo/ops/main.ts')});
    await main(['dev']);
    expect(launched).toBe(true);
  `
  const env = { ...process.env }
  delete env.PUBLIC_TEST_OTP_ACCESS
  if (override !== undefined)
    env.PUBLIC_TEST_OTP_ACCESS = override
  const result = Bun.spawnSync([process.execPath, '--no-env-file', '-e', script], { cwd: root, env, timeout: 10000 })
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})
