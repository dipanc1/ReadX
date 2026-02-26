// ─── PDF Document ────────────────────────────────────────────
export interface PdfDocument {
  id: string;
  name: string;
  uri: string;
  addedAt: number; // timestamp
  lastReadAt?: number;
  lastPage?: number;
  totalPages?: number;
}

// ─── Dictionary API Response ─────────────────────────────────
export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

export interface DictionaryEntry {
  word: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  sourceUrls?: string[];
}

// ─── Bookmarked Word ────────────────────────────────────────
export interface BookmarkedWord {
  id: string;
  word: string;
  meanings: DictionaryMeaning[];
  phonetic?: string;
  savedAt: number;
  pdfName?: string;
}

// ─── Theme ──────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    primaryLight: string;
    border: string;
    error: string;
    accent: string;
    modalOverlay: string;
  };
}

// ─── WebView Messages ───────────────────────────────────────
export interface WebViewWordMessage {
  type: 'wordTapped';
  word: string;
}

export interface WebViewPageMessage {
  type: 'pageChanged';
  page: number;
  totalPages: number;
}

export interface WebViewFullscreenMessage {
  type: 'fullscreenChanged';
  isFullscreen: boolean;
}

export type WebViewMessage = WebViewWordMessage | WebViewPageMessage | WebViewFullscreenMessage;
