import { en } from './dictionaries/en.ts';
import { fr } from './dictionaries/fr.ts';

export type Lang = 'en' | 'fr';
export type Dict = Record<string, string>;

export { en } from './dictionaries/en.ts';
export { fr } from './dictionaries/fr.ts';

export const dictionaries: Record<Lang, Dict> = { en, fr };
