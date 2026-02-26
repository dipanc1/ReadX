import AsyncStorage from '@react-native-async-storage/async-storage';
import { PdfDocument, BookmarkedWord } from '../types';

const PDFS_KEY = '@readx_pdfs';
const BOOKMARKS_KEY = '@readx_bookmarks';

// ─── PDF History ────────────────────────────────────────────

export async function getSavedPdfs(): Promise<PdfDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(PDFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePdf(pdf: PdfDocument): Promise<void> {
  const pdfs = await getSavedPdfs();
  const existing = pdfs.findIndex((p) => p.id === pdf.id);
  if (existing >= 0) {
    pdfs[existing] = { ...pdfs[existing], ...pdf };
  } else {
    pdfs.unshift(pdf);
  }
  await AsyncStorage.setItem(PDFS_KEY, JSON.stringify(pdfs));
}

export async function updatePdfProgress(
  id: string,
  page: number,
  totalPages?: number
): Promise<void> {
  const pdfs = await getSavedPdfs();
  const idx = pdfs.findIndex((p) => p.id === id);
  if (idx >= 0) {
    pdfs[idx].lastReadAt = Date.now();
    pdfs[idx].lastPage = page;
    if (totalPages) {
      pdfs[idx].totalPages = totalPages;
    }
    await AsyncStorage.setItem(PDFS_KEY, JSON.stringify(pdfs));
  }
}

export async function deletePdf(id: string): Promise<void> {
  const pdfs = await getSavedPdfs();
  const filtered = pdfs.filter((p) => p.id !== id);
  await AsyncStorage.setItem(PDFS_KEY, JSON.stringify(filtered));
}

// ─── Bookmarked Words ───────────────────────────────────────

export async function getBookmarks(): Promise<BookmarkedWord[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addBookmark(bookmark: BookmarkedWord): Promise<void> {
  const bookmarks = await getBookmarks();
  // Avoid duplicates (same word)
  const exists = bookmarks.some(
    (b) => b.word.toLowerCase() === bookmark.word.toLowerCase()
  );
  if (!exists) {
    bookmarks.unshift(bookmark);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const filtered = bookmarks.filter((b) => b.id !== id);
  await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export async function isWordBookmarked(word: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some((b) => b.word.toLowerCase() === word.toLowerCase());
}
