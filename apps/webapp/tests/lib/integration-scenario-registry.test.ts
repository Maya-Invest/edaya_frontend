import { JourneyLedger } from '../integration/setup/journey-ledger';
import { describe, expect, test } from 'bun:test';
import { assertCompleteResults, redactDiagnostic, runScenarios, validateScenarios } from '../integration/support/scenario-registry';
import { assertFeatureRegistration, FEATURE_SCENARIOS } from '../integration/support/coverage-contract';
import { QA_TEMPLATE_MATRIX } from '../../scripts/qa-template-matrix';

describe('integration execution contract', () => {
 test('visiting a route cannot credit list content or mutations', () => {
  const rows = ['Navigation directe — contenu visible','Liste','Save'].map(action => ({module:'Classes' as const,endpoint:'/classes/example',action}));
  const ledger = new JourneyLedger(rows);
  ledger.coverVisit('/classes/example','OK');
  expect(ledger.results().map(result=>result.action)).toEqual(['Navigation directe — contenu visible']);
 });
 test('setup cannot pre-credit an independently asserted behavior', () => {
  const row = FEATURE_SCENARIOS.find(row=>row.id==='web.scenario.0011')!;
  const ledger = new JourneyLedger([row as never]);
  ledger.coverPath(row.endpoint,'OK','page opened',[row.action]);
  expect(ledger.results()).toEqual([]);
 });

 test('adding an unmapped production surface fails coverage validation', () => {
  const inventory = QA_TEMPLATE_MATRIX as Array<{module: 'Classes'; endpoint: string; action: string}>;
  inventory.push({module:'Classes',endpoint:'/classes/unmapped-production-route',action:'Navigation directe — contenu visible'});
  try { expect(() => assertFeatureRegistration()).toThrow('Unregistered current action'); }
  finally { inventory.pop(); }
 });
 test('removing a required scenario fails coverage validation', () => {
  const removed = FEATURE_SCENARIOS.pop()!;
  try { expect(() => assertFeatureRegistration()).toThrow('Unregistered current action'); }
  finally { FEATURE_SCENARIOS.push(removed); }
 });
 test('failed setup blocks dependants while unrelated scenarios still execute', async () => {
  const definitions = [{id:'setup',feature:'fixture'}, {id:'dependent',feature:'write',dependsOn:['setup']}, {id:'independent',feature:'read'}];
  const ran: string[] = [];
  const results = await runScenarios(definitions, async scenario => { ran.push(scenario.id); if (scenario.id === 'setup') throw new Error('fixture absent'); });
  expect(ran).toEqual(['setup','independent']);
  expect(results.map(result => result.status)).toEqual(['failed','blocked','passed']);
  expect(() => assertCompleteResults(definitions, results)).toThrow();
 });
 test('empty, duplicate and missing registrations fail', () => {
  expect(() => validateScenarios([])).toThrow();
  expect(() => validateScenarios([{id:'x',feature:'f'},{id:'x',feature:'f'}])).toThrow();
  expect(() => validateScenarios([{id:'x',feature:'f',dependsOn:['removed']}])).toThrow();
  expect(() => assertCompleteResults([{id:'x',feature:'f'}], [])).toThrow('Missing');
 });
 test('a successful child exit cannot hide failed results', async () => {
  const definitions = [{id:'x',feature:'f'}];
  const results = await runScenarios(definitions, async () => { throw new Error('assertion failed'); });
  expect(() => assertCompleteResults(definitions, results)).toThrow('failed');
 });
 test('authentication diagnostics redact invite tokens and credentials', () => {
  expect(redactDiagnostic('/invite/sensitive?auth=signIn authorization=secret token=secret Bearer xyz'))
   .toBe('/invite/[redacted]?auth=signIn authorization=[redacted] token=[redacted] Bearer [redacted]');
 });
});
