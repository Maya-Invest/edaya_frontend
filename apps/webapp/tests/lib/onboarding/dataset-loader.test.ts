import { describe, expect, it } from 'bun:test';
import { DatasetLoader, type DatasetLoadState, type DatasetReadPort } from '../../../src/routes/onboarding/lib/dataset-loader';
import { dataset, reference } from './dataset-fixture';

const choice = { ...reference, countryCode: 'CI', label: 'Enseignement général', isDefault: true };
function harness(port: Partial<DatasetReadPort> = {}) {
 const states: DatasetLoadState[] = [];
 const loader = new DatasetLoader({list: async country => !country || country === 'CI' ? [choice] : [], get: async () => structuredClone(dataset), ...port}, state => states.push(state));
 return {loader, states, last: () => states.at(-1)!};
}
describe('canonical dataset loading', () => {
 it('resolves the country default and leaves unsupported countries empty', async () => {
  const h = harness(); await h.loader.load('CI', null);
  expect(h.last().catalog?.dataset).toEqual(dataset);
  await h.loader.load('FR', null); expect(h.last().status).toBe('empty'); expect(h.last().catalog).toBeNull();
 });
 it('selects the declared default from multiple choices', async () => {
  const h = harness({list: async () => [{...choice, id: 'other', isDefault: false}, choice]});
  await h.loader.load('CI', null); expect(h.last().catalog?.dataset.id).toBe(reference.id); expect(h.last().choices).toHaveLength(2);
 });
 it('requests an exact pinned version and never silently upgrades an unavailable one', async () => {
  const seen: unknown[] = [];
  const h = harness({get: async ref => { seen.push(ref); throw new Error('unavailable'); }});
  await h.loader.load('CI', {...reference, version: '0.9.0'});
  expect(seen).toEqual([{...reference, version: '0.9.0'}]); expect(h.last().status).toBe('error'); expect(h.last().unavailableVersion).toBe(true);
 });
 it('ignores stale retrieval responses after a country change and after teardown', async () => {
  let resolve!: (value: typeof dataset) => void;
  const h = harness({get: () => new Promise(done => {resolve = done;})});
  const first = h.loader.load('CI', null); await Promise.resolve(); await Promise.resolve();
  await h.loader.load('FR', null); resolve(dataset); await first; expect(h.last().status).toBe('empty');
  const second = h.loader.load('CI', null); await Promise.resolve(); await Promise.resolve();
  h.loader.dispose(); const count = h.states.length; resolve(dataset); await second; expect(h.states).toHaveLength(count);
 });
 it('rejects mismatched version responses and retries transient failures', async () => {
  let fail = true;
  const h = harness({get: async () => fail ? {...dataset, version: '2.0.0'} : dataset});
  await h.loader.load('CI', reference); expect(h.last().status).toBe('error');
  fail = false; await h.loader.load('CI', reference); expect(h.last().status).toBe('ready');
 });
});
