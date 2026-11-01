import { describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertCurrentExecution, beginExecution } from '../integration/support/execution-metadata';

describe('integration execution freshness', () => {
  test('rejects incomplete and stale success artifacts', () => {
    const directory = mkdtempSync(join(tmpdir(), 'edaya-execution-'));
    try {
      const complete = beginExecution(directory);
      expect(() => assertCurrentExecution(directory)).toThrow('incomplete');
      complete();
      expect(() => assertCurrentExecution(directory)).not.toThrow();
      writeFileSync(join(directory, 'execution.json'), JSON.stringify({ completed: true, fingerprint: 'older-code' }));
      expect(() => assertCurrentExecution(directory)).toThrow('stale');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
