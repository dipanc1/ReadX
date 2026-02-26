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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { lookupWord } from '../services/dictionaryService';
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
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (visible && word) {
      setLoading(true);
      setError(false);
      setEntry(null);
      setBookmarked(false);

      Promise.all([
        lookupWord(word),
        isWordBookmarked(word),
      ]).then(([result, isSaved]) => {
        if (result) {
          setEntry(result);
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

  const colors = theme.colors;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.word, { color: colors.text }]}>
                {word?.replace(/[^a-zA-Z'-]/g, '').toLowerCase()}
              </Text>
              {entry?.phonetics?.find((p) => p.text) && (
                <Text style={[styles.phonetic, { color: colors.textSecondary }]}>
                  {entry.phonetics.find((p) => p.text)?.text}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Looking up meaning...
                </Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.center}>
                <Text style={[styles.errorEmoji]}>📖</Text>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                  No definition found for "{word}"
                </Text>
                <TouchableOpacity
                  style={[styles.googleBtn, { backgroundColor: colors.primary }]}
                  onPress={handleGoogleSearch}
                >
                  <Text style={styles.googleBtnText}>Search on Google</Text>
                </TouchableOpacity>
              </View>
            )}

            {entry && !loading && (
              <>
                {entry.meanings.map((meaning, idx) => (
                  <View key={idx} style={styles.meaningBlock}>
                    <View
                      style={[
                        styles.posTag,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Text style={[styles.posText, { color: colors.primary }]}>
                        {meaning.partOfSpeech}
                      </Text>
                    </View>

                    {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                      <View key={dIdx} style={styles.definitionBlock}>
                        <Text style={[styles.defNumber, { color: colors.primary }]}>
                          {dIdx + 1}.
                        </Text>
                        <View style={styles.defContent}>
                          <Text style={[styles.defText, { color: colors.text }]}>
                            {def.definition}
                          </Text>
                          {def.example && (
                            <Text
                              style={[
                                styles.example,
                                { color: colors.textSecondary },
                              ]}
                            >
                              "{def.example}"
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}

                    {meaning.synonyms.length > 0 && (
                      <View style={styles.synonymBlock}>
                        <Text
                          style={[styles.synLabel, { color: colors.textSecondary }]}
                        >
                          Synonyms:
                        </Text>
                        <Text style={[styles.synWords, { color: colors.accent }]}>
                          {meaning.synonyms.slice(0, 5).join(', ')}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* Actions */}
          {entry && !loading && (
            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: bookmarked
                      ? colors.primaryLight
                      : colors.primary,
                  },
                ]}
                onPress={handleBookmark}
                disabled={bookmarked}
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: bookmarked ? colors.primary : '#FFFFFF' },
                  ]}
                >
                  {bookmarked ? '✓ Saved' : '★ Save Word'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={handleGoogleSearch}
              >
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  🔍 Google
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  word: {
    fontSize: 24,
    fontWeight: '700',
  },
  phonetic: {
    fontSize: 14,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  googleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  meaningBlock: {
    marginBottom: 20,
  },
  posTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  posText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  definitionBlock: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  defNumber: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
    marginTop: 1,
  },
  defContent: {
    flex: 1,
  },
  defText: {
    fontSize: 15,
    lineHeight: 22,
  },
  example: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 19,
  },
  synonymBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  synLabel: {
    fontSize: 13,
    marginRight: 6,
  },
  synWords: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
