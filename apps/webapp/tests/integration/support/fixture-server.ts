import type { InlineConfig } from 'vite';
import { resolve } from 'node:path';
import { waitForUrl } from '../../../../../tooling/repo/ops/runtime';
import { Services } from '../../../../../tooling/repo/ops/services';

/** Run Vite in an owned worker so native watcher shutdown cannot hang the test. */
export async function createFixtureServer(config: InlineConfig, name: string, port: number, path: string) {
  const override = process.env.EDAYA_FIXTURE_PORT;
  if (override) {
    const parsed = Number(override);
    if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) throw new Error('EDAYA_FIXTURE_PORT must be an unprivileged TCP port');
    port = parsed;
  }
  const url = `http://127.0.0.1:${port}${path}`;
  if (process.argv.includes('--edaya-fixture-server')) {
    const { createServer } = await import('vite');
    const server = await createServer({ ...config, server: { ...config.server, host: '127.0.0.1', port, strictPort: true } });
    try { await server.listen(); }
    catch (error) {
      // A failed Vite listener can leave watcher handles alive. This owned worker
      // must exit so the parent reports the startup error instead of timing out.
      console.error(error);
      process.exit(1);
    }
    // The parent owns termination, including the process group and a bounded
    // SIGKILL fallback. It never relies on Vite's in-process close promise.
    return await new Promise<never>(() => {});
  }

  const services = new Services();
  const diagnostics = `${name}-services.json`;
  try {
    services.start(name, [process.execPath, resolve(process.argv[1]!), '--edaya-fixture-server'], resolve(config.root ?? process.cwd()), { ...process.env });
    await waitForUrl(url, 120, () => services.assertRunning());
  } catch (error) {
    await services.stop(diagnostics);
    throw error;
  }
  return {
    url,
    async close() {
      try { services.assertRunning(); }
      finally { await services.stop(diagnostics); }
    },
  };
}
