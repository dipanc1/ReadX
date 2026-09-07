export interface PdfDocument {
  id: string;
  name: string;
  uri: string;
  addedAt: number;
  lastReadAt?: number;
  lastPage?: number;
  totalPages?: number;
}
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
export interface BookmarkedWord {
  id: string;
  word: string;
  meanings: DictionaryMeaning[];
  phonetic?: string;
  savedAt: number;
  pdfName?: string;
}
export interface AppTheme {
  mode: 'dark';
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

export interface WebViewGoBackMessage {
  type: 'goBack';
}

/** PDF.js could not read the PDF over file:// — RN should retry by sending bytes. */
export interface WebViewUrlLoadFailedMessage {
  type: 'urlLoadFailed';
  message: string;
}

/** The CDN-hosted PDF.js library never loaded (typically no network). */
export interface WebViewEngineUnavailableMessage {
  type: 'engineUnavailable';
}

export type WebViewMessage =
  | WebViewWordMessage
  | WebViewPageMessage
  | WebViewFullscreenMessage
  | WebViewGoBackMessage
  | WebViewUrlLoadFailedMessage
  | WebViewEngineUnavailableMessage;
