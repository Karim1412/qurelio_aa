import en, { type Messages } from './messages/en';
import fr from './messages/fr';
import type { Locale } from './config';

export const dictionaries: Record<Locale, Messages> = { en, fr };

export type { Messages };
