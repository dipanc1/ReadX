import { DictionaryEntry, DictionaryMeaning } from '../types';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const WIKTIONARY_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition';

const FETCH_TIMEOUT_MS = 5000;

export type LookupResult =
  | { status: 'found'; entry: DictionaryEntry }
  | { status: 'not_found' }
  | { status: 'network_error' };

const cache = new Map<string, LookupResult>();

function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  }).finally(() => clearTimeout(timer));
}

async function lookupPrimary(word: string): Promise<LookupResult> {
  const response = await fetchWithTimeout(`${BASE_URL}/${encodeURIComponent(word)}`);

  if (response.status === 404) {
    return { status: 'not_found' };
  }
  if (!response.ok) {
    // 5xx / rate limit — treat as a network problem so the fallback kicks in
    return { status: 'network_error' };
  }

  const data: DictionaryEntry[] = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    return { status: 'found', entry: data[0] };
  }
  return { status: 'not_found' };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

interface WiktionaryDefinition {
  definition: string;
  examples?: string[];
}

interface WiktionaryUsage {
  partOfSpeech: string;
  definitions: WiktionaryDefinition[];
}

async function lookupWiktionary(word: string): Promise<LookupResult> {
  const response = await fetchWithTimeout(`${WIKTIONARY_URL}/${encodeURIComponent(word)}`);

  if (response.status === 404) {
    return { status: 'not_found' };
  }
  if (!response.ok) {
    return { status: 'network_error' };
  }

  const data: Record<string, WiktionaryUsage[]> = await response.json();
  const usages = data.en;
  if (!Array.isArray(usages) || usages.length === 0) {
    return { status: 'not_found' };
  }

  const meanings: DictionaryMeaning[] = usages
    .map((usage) => ({
      partOfSpeech: (usage.partOfSpeech || '').toLowerCase(),
      definitions: (usage.definitions || [])
        .map((d) => ({
          definition: stripHtml(d.definition || ''),
          example: d.examples?.length ? stripHtml(d.examples[0]) : undefined,
          synonyms: [],
          antonyms: [],
        }))
        .filter((d) => d.definition.length > 0),
      synonyms: [],
      antonyms: [],
    }))
    .filter((m) => m.definitions.length > 0);

  if (meanings.length === 0) {
    return { status: 'not_found' };
  }

  return {
    status: 'found',
    entry: { word, phonetics: [], meanings },
  };
}

export async function lookupWord(word: string): Promise<LookupResult> {
  const cleaned = word.replace(/[^a-zA-Z'-]/g, '').trim().toLowerCase();

  if (!cleaned || cleaned.length < 2) {
    return { status: 'not_found' };
  }

  const cached = cache.get(cleaned);
  if (cached) {
    return cached;
  }

  let result: LookupResult;
  try {
    result = await lookupPrimary(cleaned);
  } catch {
    result = { status: 'network_error' };
  }

  // Primary API is flaky — fall back to Wiktionary on failure
  if (result.status === 'network_error') {
    try {
      result = await lookupWiktionary(cleaned);
    } catch {
      result = { status: 'network_error' };
    }
  }

  // Only cache definitive answers, not transient failures
  if (result.status !== 'network_error') {
    cache.set(cleaned, result);
  }

  return result;
}
