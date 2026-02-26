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
  Dimensions,
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
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: theme.mode === 'dark' ? '#000' : '#6366F1',
            },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.word, { color: colors.text }]}>
                {cleanWord}
              </Text>
              {entry?.phonetics?.find((p) => p.text) && (
                <Text style={[styles.phonetic, { color: colors.primary }]}>
                  {entry.phonetics.find((p) => p.text)?.text}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.primaryLight }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeBtnText, { color: colors.primary }]}>
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
                <View style={[styles.errorCircle, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.errorEmoji}>📖</Text>
                </View>
                <Text style={[styles.errorTitle, { color: colors.text }]}>
                  Word not found
                </Text>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                  No definition available for "{cleanWord}"
                </Text>
                <TouchableOpacity
                  style={[styles.googleBtn, { backgroundColor: colors.primary }]}
                  onPress={handleGoogleSearch}
                  activeOpacity={0.8}
                >
                  <Text style={styles.googleBtnText}>🔍  Search on Google</Text>
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
                        <View style={[styles.defDot, { backgroundColor: colors.primary }]} />
                        <View style={styles.defContent}>
                          <Text style={[styles.defText, { color: colors.text }]}>
                            {def.definition}
                          </Text>
                          {def.example && (
                            <View style={[styles.exampleBox, { backgroundColor: colors.primaryLight }]}>
                              <Text
                                style={[
                                  styles.example,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                "{def.example}"
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}

                    {meaning.synonyms.length > 0 && (
                      <View style={[styles.synonymBlock, { backgroundColor: colors.primaryLight }]}>
                        <Text
                          style={[styles.synLabel, { color: colors.textSecondary }]}
                        >
                          Synonyms
                        </Text>
                        <View style={styles.synChips}>
                          {meaning.synonyms.slice(0, 5).map((syn, sIdx) => (
                            <View key={sIdx} style={[styles.synChip, { borderColor: colors.border }]}>
                              <Text style={[styles.synChipText, { color: colors.primary }]}>
                                {syn}
                              </Text>
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

          {/* Actions */}
          {entry && !loading && (
            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.saveBtn,
                  {
                    backgroundColor: bookmarked
                      ? colors.primaryLight
                      : colors.primary,
                    shadowColor: bookmarked ? 'transparent' : colors.primary,
                  },
                ]}
                onPress={handleBookmark}
                disabled={bookmarked}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: bookmarked ? colors.primary : '#FFFFFF' },
                  ]}
                >
                  {bookmarked ? '✓  Saved' : '★  Save Word'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.googleActionBtn,
                  { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={handleGoogleSearch}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.text }]}>
                  🔍
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
  overlayTouch: {
    flex: 1,
  },
  container: {
    maxHeight: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  word: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  phonetic: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  errorCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorEmoji: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  googleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  meaningBlock: {
    marginBottom: 24,
  },
  posTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  posText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  definitionBlock: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  defDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  defContent: {
    flex: 1,
  },
  defText: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  exampleBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
  },
  example: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  synonymBlock: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  synLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  synChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  synChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  synChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    paddingBottom: 28,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  googleActionBtn: {
    width: 52,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
