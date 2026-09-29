import definitions from '../features.json';
import { READ_SCENARIOS } from './read-workflows';

// These behavior contracts must execute their own assertions after fixture setup.
// A setup-page visit must never pre-credit them in the journey ledger.
const independent = new Set([
  ...Object.keys(READ_SCENARIOS),
  ...[65,54,179,165,31,55,159,24,25,163,170,172,175,3,5,6,11,12,13,18,64,66,67,68,69,75,81,82,90,100,101,102,103,104,108,109,110,115,118,122,135,136,160].map(id => `web.scenario.${String(id).padStart(4,'0')}`),
]);
export function requiresIndependentScenario(row: {endpoint:string;action:string}): boolean {
  const path = (value:string) => value.replace(/^https?:\/\/[^/]+/,'');
  const definition = definitions.find(definition => path(definition.endpoint) === path(row.endpoint) && definition.action === row.action);
  return Boolean(definition && independent.has(definition.id));
}
