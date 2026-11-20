import { getContext, setContext } from 'svelte';

const key = Symbol('collection-presentation');
export class CollectionPresentation {
  hiddenSort = $state('');
  sorts = $state<{ key: string; label: string; active: boolean; run: () => void }[]>([]);
}
export function provideCollectionPresentation() {
  return setContext(key, new CollectionPresentation());
}
export function collectionPresentation() {
  return getContext<CollectionPresentation | undefined>(key);
}
