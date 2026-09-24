import { DictionaryEntry, DictionaryMeaning } from '../types';

const WIKTIONARY_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition';

const FETCH_TIMEOUT_MS = 3000;

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
    headers: {
      Accept: 'application/json',
      // Wikimedia's bot policy can 403 generic client UAs (RN sends "okhttp/...")
      'User-Agent': 'ReadX-PDF-Reader/1.0 (dictionary lookup)',
      'Api-User-Agent': 'ReadX-PDF-Reader/1.0 (dictionary lookup)',
    },
  }).finally(() => clearTimeout(timer));
}

function stripHtml(html: string): string {
  return html
    // style blocks carry CSS text that would survive plain tag removal
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
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
    console.warn(`[dictionary] wiktionary HTTP ${response.status} for "${word}"`);
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

  // "symbol"/"letter" entries (ISO codes etc.) are trivia — show real senses first
  const MINOR_POS = new Set(['symbol', 'letter', 'character', 'punctuation mark']);
  meanings.sort(
    (a, b) => Number(MINOR_POS.has(a.partOfSpeech)) - Number(MINOR_POS.has(b.partOfSpeech))
  );

  return {
    status: 'found',
    entry: { word, phonetics: [], meanings },
  };
}

async function tryLookup(word: string): Promise<LookupResult> {
  try {
    return await lookupWiktionary(word);
  } catch (e: any) {
    console.warn(`[dictionary] wiktionary failed for "${word}": ${e?.message || e}`);
    return { status: 'network_error' };
  }
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

  let result = await tryLookup(cleaned);

  // One retry — transient DNS/socket hiccups are common on mobile
  if (result.status === 'network_error') {
    result = await tryLookup(cleaned);
  }

  // Only cache definitive answers, not transient failures
  if (result.status !== 'network_error') {
    cache.set(cleaned, result);
  }

  return result;
}
