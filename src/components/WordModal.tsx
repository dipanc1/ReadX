import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { lookupWord, LookupResult } from '../services/dictionaryService';
import { addBookmark, isWordBookmarked } from '../services/storageService';
import { DictionaryEntry, BookmarkedWord } from '../types';

interface WordModalProps {
  visible: boolean;
  word: string;
  pdfName?: string;
  onClose: () => void;
}

export const WordModal: React.FC<WordModalProps> = ({
  visible,
  word,
  pdfName,
  onClose,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [error, setError] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  useEffect(() => {
    if (visible && word) {
      setLoading(true);
      setError(false);
      setNetworkError(false);
      setEntry(null);
      setBookmarked(false);

      Promise.all([
        lookupWord(word),
        isWordBookmarked(word),
      ]).then(([result, isSaved]) => {
        if (result.status === 'found') {
          setEntry(result.entry);
        } else if (result.status === 'network_error') {
          setNetworkError(true);
        } else {
          setError(true);
        }
        setBookmarked(isSaved);
        setLoading(false);
      });
    }
  }, [visible, word]);

  const handleBookmark = async () => {
    if (!entry) return;

    const bookmark: BookmarkedWord = {
      id: Date.now().toString(),
      word: entry.word,
      meanings: entry.meanings,
      phonetic: entry.phonetics?.find((p) => p.text)?.text,
      savedAt: Date.now(),
      pdfName,
    };

    await addBookmark(bookmark);
    setBookmarked(true);
  };

  const handleGoogleSearch = () => {
    const url = `https://www.google.com/search?q=define+${encodeURIComponent(word)}`;
    Linking.openURL(url);
  };

  const cleanWord = word?.replace(/[^a-zA-Z'-]/g, '').toLowerCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#D1D5DB' }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
            <View style={styles.headerLeft}>
              <View style={styles.wordRow}>
                <View style={[styles.wordAccent, { backgroundColor: colors.primary }]} />
                <Text style={[styles.word, { color: colors.text }]}>{cleanWord}</Text>
              </View>
              {entry?.phonetics?.find((p) => p.text) && (
                <View style={[styles.phoneticChip, { backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : '#F0EEFF' }]}>
                  <Ionicons name="volume-medium-outline" size={13} color={colors.primary} />
                  <Text style={[styles.phonetic, { color: colors.primary }]}>
                    {entry.phonetics.find((p) => p.text)?.text}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }]}
              activeOpacity={0.6}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>
                  Looking up meaning...
                </Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.centered}>
                <View style={[styles.errCircle, { backgroundColor: isDark ? 'rgba(129,140,248,0.08)' : '#F0EEFF' }]}>
                  <Ionicons name="search-outline" size={34} color={colors.primary} />
                </View>
                <Text style={[styles.errTitle, { color: colors.text }]}>Word not found</Text>
                <Text style={[styles.errSub, { color: colors.textSecondary }]}>
                  We couldn't find a definition{"\n"}for "{cleanWord}" in the dictionary
                </Text>
                <TouchableOpacity
                  style={[styles.googleFallback, { backgroundColor: colors.primary }]}
                  onPress={handleGoogleSearch}
                  activeOpacity={0.75}
                >
                  <Ionicons name="logo-google" size={16} color="#FFF" />
                  <Text style={styles.googleFallbackText}>Look up on Google</Text>
                </TouchableOpacity>
              </View>
            )}

            {networkError && !loading && (
              <View style={styles.centered}>
                <View style={[styles.errCircle, { backgroundColor: isDark ? 'rgba(248,113,113,0.08)' : '#FEF2F2' }]}>
                  <Ionicons name="cloud-offline-outline" size={34} color={colors.error} />
                </View>
                <Text style={[styles.errTitle, { color: colors.text }]}>No internet connection</Text>
                <Text style={[styles.errSub, { color: colors.textSecondary }]}>
                  Check your connection and{"\n"}try tapping the word again
                </Text>
                <TouchableOpacity
                  style={[styles.googleFallback, { backgroundColor: colors.primary }]}
                  onPress={handleGoogleSearch}
                  activeOpacity={0.75}
                >
                  <Ionicons name="logo-google" size={16} color="#FFF" />
                  <Text style={styles.googleFallbackText}>Try on Google</Text>
                </TouchableOpacity>
              </View>
            )}

            {entry && !loading && (
              <>
                {entry.meanings.map((meaning, idx) => (
                  <View key={idx} style={styles.meaningSection}>
                    <View style={[styles.posChip, { backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : '#F0EEFF' }]}>
                      <Text style={[styles.posLabel, { color: colors.primary }]}>
                        {meaning.partOfSpeech}
                      </Text>
                    </View>

                    {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                      <View key={dIdx} style={styles.defRow}>
                        <View style={[styles.defBullet, { backgroundColor: colors.primary }]} />
                        <View style={styles.defBody}>
                          <Text style={[styles.defText, { color: colors.text }]}>
                            {def.definition}
                          </Text>
                          {def.example && (
                            <View style={[styles.exampleBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA' }]}>
                              <Ionicons name="chatbubble-outline" size={11} color={colors.textSecondary} style={{ marginTop: 3 }} />
                              <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                                {def.example}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}

                    {meaning.synonyms.length > 0 && (
                      <View style={styles.synSection}>
                        <Text style={[styles.synTitle, { color: colors.textSecondary }]}>SYNONYMS</Text>
                        <View style={styles.synRow}>
                          {meaning.synonyms.slice(0, 5).map((syn, sIdx) => (
                            <View key={sIdx} style={[styles.synTag, { backgroundColor: isDark ? 'rgba(129,140,248,0.08)' : '#F0EEFF' }]}>
                              <Text style={[styles.synTagText, { color: colors.primary }]}>{syn}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* Footer actions */}
          {entry && !loading && (
            <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
              <TouchableOpacity
                style={[
                  styles.mainAction,
                  {
                    backgroundColor: bookmarked
                      ? (isDark ? 'rgba(52,211,153,0.12)' : '#ECFDF5')
                      : colors.primary,
                  },
                ]}
                onPress={handleBookmark}
                disabled={bookmarked}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={bookmarked ? 'checkmark-circle' : 'bookmark-outline'}
                  size={18}
                  color={bookmarked ? '#34D399' : '#FFF'}
                />
                <Text style={[styles.mainActionText, { color: bookmarked ? '#34D399' : '#FFF' }]}>
                  {bookmarked ? 'Saved to Vocabulary' : 'Save Word'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }]}
                onPress={handleGoogleSearch}
                activeOpacity={0.6}
              >
                <Ionicons name="logo-google" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayTouch: { flex: 1 },

  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      android: { elevation: 24 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24 },
    }),
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordAccent: { width: 4, height: 28, borderRadius: 2 },
  word: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  phoneticChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  phonetic: { fontSize: 13, fontWeight: '600' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  centered: { alignItems: 'center', paddingVertical: 36 },
  loadingLabel: { marginTop: 14, fontSize: 14, fontWeight: '500' },

  errCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  errSub: { fontSize: 14, textAlign: 'center', marginBottom: 18 },
  googleFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  googleFallbackText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  meaningSection: { marginBottom: 22 },
  posChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  posLabel: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize', letterSpacing: 0.2 },

  defRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  defBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 9, marginRight: 12 },
  defBody: { flex: 1 },
  defText: { fontSize: 15, lineHeight: 23, letterSpacing: 0.1 },
  exampleBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  exampleText: { flex: 1, fontSize: 13, fontStyle: 'italic', lineHeight: 19 },

  synSection: { marginTop: 4 },
  synTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  synRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  synTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  synTagText: { fontSize: 13, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    padding: 18,
    paddingBottom: Platform.OS === 'android' ? 22 : 30,
    gap: 10,
    borderTopWidth: 1,
  },
  mainAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    ...Platform.select({
      android: { elevation: 3 },
      ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    }),
  },
  mainActionText: { fontSize: 15, fontWeight: '700' },
  secondaryAction: {
    width: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
