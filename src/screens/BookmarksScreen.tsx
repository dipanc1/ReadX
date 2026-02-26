import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getBookmarks, removeBookmark } from '../services/storageService';
import { BookmarkedWord } from '../types';

export const BookmarksScreen: React.FC = () => {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState<BookmarkedWord[]>([]);
  const colors = theme.colors;

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    const saved = await getBookmarks();
    setBookmarks(saved);
  };

  const handleDelete = (bookmark: BookmarkedWord) => {
    Alert.alert('Remove Word', `Remove "${bookmark.word}" from bookmarks?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeBookmark(bookmark.id);
          await loadBookmarks();
        },
      },
    ]);
  };

  const handleGoogleSearch = (word: string) => {
    const url = `https://www.google.com/search?q=define+${encodeURIComponent(word)}`;
    Linking.openURL(url);
  };

  const renderBookmark = ({ item }: { item: BookmarkedWord }) => {
    const firstMeaning = item.meanings[0];
    const firstDef = firstMeaning?.definitions[0];

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: theme.mode === 'dark' ? '#000' : '#6366F1',
          },
        ]}
        onLongPress={() => handleDelete(item)}
        onPress={() => handleGoogleSearch(item.word)}
        activeOpacity={0.7}
      >
        {/* Accent strip */}
        <View style={[styles.accentStrip, { backgroundColor: colors.primary }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.wordRow}>
              <Text style={[styles.word, { color: colors.text }]}>{item.word}</Text>
              {item.phonetic && (
                <Text style={[styles.phonetic, { color: colors.textSecondary }]}>
                  {item.phonetic}
                </Text>
              )}
            </View>
            <View style={[styles.googleIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.googleIconText}>🔍</Text>
            </View>
          </View>

          {firstMeaning && (
            <View
              style={[styles.posTag, { backgroundColor: colors.primaryLight }]}
            >
              <Text style={[styles.posText, { color: colors.primary }]}>
                {firstMeaning.partOfSpeech}
              </Text>
            </View>
          )}

          {firstDef && (
            <Text
              style={[styles.definition, { color: colors.text }]}
              numberOfLines={3}
            >
              {firstDef.definition}
            </Text>
          )}

          {firstDef?.example && (
            <View style={[styles.exampleContainer, { backgroundColor: colors.primaryLight }]}>
              <Text
                style={[styles.example, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                "{firstDef.example}"
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {item.pdfName ? `📄 ${item.pdfName.replace('.pdf', '')}` : ''}
            </Text>
            <Text style={[styles.footerDate, { color: colors.textSecondary }]}>
              {new Date(item.savedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.brandLabel, { color: colors.primary }]}>VOCABULARY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Saved Words</Text>
        </View>
        {bookmarks.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {bookmarks.length}
            </Text>
          </View>
        )}
      </View>

      {bookmarks.length > 0 ? (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.emptyEmoji}>⭐</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Build your vocabulary
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Tap any word while reading to see its meaning,{'\n'}then save it here for future reference.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  brandLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  countText: {
    fontSize: 15,
    fontWeight: '800',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accentStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wordRow: {
    flex: 1,
  },
  word: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  phonetic: {
    fontSize: 13,
    marginTop: 2,
  },
  googleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  googleIconText: {
    fontSize: 14,
  },
  posTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  posText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  definition: {
    fontSize: 14,
    lineHeight: 21,
  },
  exampleContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  example: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
