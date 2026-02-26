import { DictionaryEntry } from '../types';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export type LookupResult =
  | { status: 'found'; entry: DictionaryEntry }
  | { status: 'not_found' }
  | { status: 'network_error' };

export async function lookupWord(
  word: string
): Promise<LookupResult> {
  // Clean the word: remove punctuation, trim whitespace
  const cleaned = word.replace(/[^a-zA-Z'-]/g, '').trim().toLowerCase();

  if (!cleaned || cleaned.length < 2) {
    return { status: 'not_found' };
  }

  try {
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(cleaned)}`);

    if (!response.ok) {
      return { status: 'not_found' };
    }

    const data: DictionaryEntry[] = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return { status: 'found', entry: data[0] };
    }

    return { status: 'not_found' };
  } catch {
    return { status: 'network_error' };
  }
}
