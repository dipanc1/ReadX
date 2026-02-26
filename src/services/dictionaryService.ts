import { DictionaryEntry } from '../types';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export async function lookupWord(
  word: string
): Promise<DictionaryEntry | null> {
  // Clean the word: remove punctuation, trim whitespace
  const cleaned = word.replace(/[^a-zA-Z'-]/g, '').trim().toLowerCase();

  if (!cleaned || cleaned.length < 2) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/${encodeURIComponent(cleaned)}`);

    if (!response.ok) {
      return null;
    }

    const data: DictionaryEntry[] = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }

    return null;
  } catch {
    return null;
  }
}
